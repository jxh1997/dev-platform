import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
if (!process.env.CI) config({ path: '.env.test', override: true, quiet: true });
if (
  process.env.APP_ENV !== 'test' ||
  process.env.INSTANCE_ID !== 'dev-platform-test' ||
  process.env.DB_DATABASE !== 'dev_platform_test' ||
  process.env.DB_USERNAME !== 'devplatform_test' ||
  !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST ?? '')
)
  throw new Error('只接受本机隔离测试配置');
const require = createRequire(import.meta.url);
const { createDataSource, runDatabaseMigrations } =
  require('../dist/packages/database/src') as typeof import('../packages/database/src');
const { resolveAuthorization } =
  require('../dist/packages/backend-modules/src/auth/authorization') as typeof import('../packages/backend-modules/src/auth/authorization');
const root = await createConnection({
  host: '127.0.0.1',
  port: 13309,
  user: 'root',
  password: process.env.MYSQL_ROOT_PASSWORD,
});
const run = randomUUID().slice(0, 8);
let checks = 0;
async function scenario(
  label: string,
  verify: (db: import('typeorm').DataSource) => Promise<void>,
) {
  const database = `dev_platform_recovery_${run}_${label}`;
  await root.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs`,
  );
  await root.query(
    `GRANT ALL PRIVILEGES ON \`${database}\`.* TO 'devplatform_test'@'%'`,
  );
  const db = await createDataSource({
    ...process.env,
    DB_PORT: '13309',
    DB_DATABASE: database,
  }).initialize();
  try {
    const migrations = [...db.migrations];
    db.migrations = migrations.filter(
      (m) => m.constructor.name === 'InitialFramework1794268800000',
    );
    await runDatabaseMigrations(db);
    await db.query(
      "INSERT INTO sys_user (username,password_hash,real_name,enabled,must_change_password,security_version) VALUES ('fixture_root','not-a-login-credential','ROOT',1,0,1),('fixture_member','not-a-login-credential','MEMBER',1,0,1)",
    );
    await db.query(
      "INSERT INTO sys_audit (user_id,action,resource_id,request_id,details,created_at) SELECT id,'system:admin:init',id,'recovery-test','{}',UTC_TIMESTAMP(3) FROM sys_user WHERE username='fixture_root'",
    );
    await db.query(
      "INSERT INTO sys_user_permission (user_id,code,scope) SELECT id,'demo:record:update','SELF' FROM sys_user WHERE username='fixture_member'",
    );
    db.migrations = migrations;
    await verify(db);
    checks++;
    console.log(`PASS ${label}`);
  } finally {
    await db.destroy();
  }
}
async function complete(db: import('typeorm').DataSource) {
  await runDatabaseMigrations(db);
  assert.equal(await db.showMigrations(), false);
  const rows: { id: string; username: string }[] = await db.query(
    'SELECT id,username FROM sys_user',
  );
  const member = rows.find((u) => u.username === 'fixture_member')!,
    admin = rows.find((u) => u.username === 'fixture_root')!;
  assert.deepEqual(
    (await resolveAuthorization(db.manager, member.id)).permissions,
    { 'demo:record:update': 'SELF' },
  );
  assert.equal(
    (await resolveAuthorization(db.manager, member.id)).isSuperAdmin,
    false,
  );
  assert.equal(
    (await resolveAuthorization(db.manager, admin.id)).isSuperAdmin,
    true,
  );
  const counts = await db.query(
    "SELECT COUNT(*) AS count FROM sys_migrations WHERE name='SystemAuthorization1794355200000'",
  );
  assert.equal(String(counts[0].count), '1');
  assert.equal((await runDatabaseMigrations(db)).length, 0);
}
/** 故障在真实 SQL 提交后触发；故意保留结构，不能靠重置库获得成功。 */
async function interrupt(
  db: import('typeorm').DataSource,
  match: (sql: string) => boolean,
  commit = false,
) {
  const original = db.createQueryRunner.bind(db);
  let triggered = false;
  db.createQueryRunner = (...args) => {
    const runner = original(...args),
      query = runner.query.bind(runner);
    runner.query = async (...params: Parameters<typeof query>) => {
      const result = await query(...params);
      if (!triggered && match(params[0])) {
        triggered = true;
        if (commit) await query('COMMIT');
        throw new Error('test-only interruption');
      }
      return result;
    };
    return runner;
  };
  try {
    await assert.rejects(runDatabaseMigrations(db), /test-only interruption/);
  } finally {
    db.createQueryRunner = original;
  }
  assert.equal(triggered, true);
  const rows = await db.query(
    "SELECT COUNT(*) AS count FROM sys_migrations WHERE name='SystemAuthorization1794355200000'",
  );
  assert.equal(String(rows[0].count), '0');
}
try {
  await scenario('fresh', complete);
  await scenario('column', async (db) => {
    await interrupt(db, (sql) =>
      sql.startsWith('ALTER TABLE sys_user ADD version'),
    );
    assert.equal(
      await db.createQueryRunner().hasColumn('sys_user', 'version'),
      true,
    );
    await complete(db);
  });
  await scenario('tables', async (db) => {
    await interrupt(db, (sql) => sql.startsWith('CREATE TABLE sys_role_menu'));
    await complete(db);
  });
  await scenario('partial_seeds', async (db) => {
    await interrupt(
      db,
      (sql) =>
        sql.startsWith('INSERT INTO sys_role_menu ') &&
        sql.includes("r.code='super-admin'"),
      true,
    );
    await complete(db);
  });
  await scenario('legacy_seeds', async (db) => {
    await interrupt(
      db,
      (sql) =>
        sql.startsWith('INSERT INTO sys_role_permission ') &&
        sql.includes("r.code=CONCAT('legacy-'"),
      true,
    );
    await complete(db);
  });
  await scenario('column_drift', async (db) => {
    await db.query(
      "ALTER TABLE sys_user ADD version VARCHAR(8) NOT NULL DEFAULT '1'",
    );
    await assert.rejects(runDatabaseMigrations(db), /sys_user.version/);
    const rows = await db.query(
      "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_role'",
    );
    assert.equal(String(rows[0].count), '0');
  });
  await scenario('grant_drift', async (db) => {
    await interrupt(
      db,
      (sql) =>
        sql.startsWith('INSERT INTO sys_role_permission ') &&
        sql.includes("r.code=CONCAT('legacy-'"),
      true,
    );
    await db.query(
      "UPDATE sys_role_permission rp JOIN sys_role r ON r.id=rp.role_id SET rp.scope='ALL' WHERE r.code LIKE 'legacy-%'",
    );
    await assert.rejects(runDatabaseMigrations(db), /已有范围/);
    const rows = await db.query(
      "SELECT scope FROM sys_role_permission rp JOIN sys_role r ON r.id=rp.role_id WHERE r.code LIKE 'legacy-%'",
    );
    assert.equal(rows[0].scope, 'ALL');
  });
  await scenario('concurrent', async (db) => {
    const blocker = db.createQueryRunner();
    try {
      await blocker.query(
        "SELECT GET_LOCK(CONCAT('devplatform:',LEFT(SHA2(DATABASE(),256),48)),0)",
      );
      await assert.rejects(runDatabaseMigrations(db), /另一个迁移进程/);
    } finally {
      await blocker.query(
        "SELECT RELEASE_LOCK(CONCAT('devplatform:',LEFT(SHA2(DATABASE(),256),48)))",
      );
      await blocker.release();
    }
    await complete(db);
  });
  console.log(`真实 MySQL 迁移恢复：${checks} 组通过；隔离数据库保留用于核查`);
} finally {
  await root.end();
}
