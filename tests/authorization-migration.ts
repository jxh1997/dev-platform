import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
if (!process.env.CI) config({ path: '.env.test', override: true, quiet: true });
if (
  process.env.APP_ENV !== 'test' ||
  process.env.INSTANCE_ID !== 'dev-platform-test' ||
  process.env.DB_DATABASE !== 'dev_platform_test' ||
  process.env.DB_USERNAME !== 'devplatform_test' ||
  !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST ?? '')
)
  throw new Error('拒绝非本机独立测试环境');
const require = createRequire(import.meta.url);
const { createDataSource, User, Role, UserRole, UserPermission } =
  require('../dist/packages/database/src') as typeof import('../packages/database/src');
const { resolveAuthorization } =
  require('../dist/packages/backend-modules/src/auth/authorization') as typeof import('../packages/backend-modules/src/auth/authorization');
// 专门的迁移演练容器，不能与 13307 集成测试实例共享卷。
const db = await createDataSource({
  ...process.env,
  DB_PORT: '13308',
}).initialize();
try {
  const tables: unknown[] = await db.query("SHOW TABLES LIKE 'sys_user'");
  if (tables.length)
    throw new Error('迁移演练要求新建空实例；不重置已有数据库');
  const migrations = [...db.migrations];
  db.migrations = migrations.filter(
    (m) => m.constructor.name === 'InitialFramework1794268800000',
  );
  await db.runMigrations({ transaction: 'each' });
  const run = randomUUID().slice(0, 8),
    passwordHash = 'migration-fixture-not-a-credential';
  for (const label of ['ROOT', 'MEMBER'])
    await db.query(
      'INSERT INTO sys_user (username,password_hash,real_name,enabled,must_change_password,security_version) VALUES (?,?,?,1,0,1)',
      [`${run}_${label}`, passwordHash, label],
    );
  const rows: { id: string; real_name: string }[] = await db.query(
    'SELECT id,real_name FROM sys_user ORDER BY id',
  );
  const root = rows.find((r) => r.real_name === 'ROOT')!,
    member = rows.find((r) => r.real_name === 'MEMBER')!;
  await db.query(
    'INSERT INTO sys_audit (user_id,action,resource_id,request_id,details,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(3))',
    [root.id, 'system:admin:init', root.id, 'migration-test', '{}'],
  );
  await db.query(
    "INSERT INTO sys_user_permission (user_id,code,scope) VALUES (?,'demo:record:list','ALL'),(?,'demo:record:update','SELF')",
    [member.id, member.id],
  );
  await db.query('UPDATE sys_bootstrap SET completed=1 WHERE id=1');
  db.migrations = migrations;
  await db.runMigrations({ transaction: 'each' });
  assert.equal(await db.showMigrations(), false);
  const auth = await resolveAuthorization(db.manager, member.id);
  assert.deepEqual(auth.permissions, {
    'demo:record:list': 'ALL',
    'demo:record:update': 'SELF',
  });
  assert.equal(auth.isSuperAdmin, false);
  assert.equal(
    (await resolveAuthorization(db.manager, root.id)).isSuperAdmin,
    true,
  );
  assert.equal(
    await db.getRepository(UserPermission).countBy({ userId: member.id }),
    2,
  );
  assert.equal(
    (await db.getRepository(User).findOneByOrFail({ id: member.id })).username,
    `${run}_member`,
  );
  assert.equal(
    await db.getRepository(Role).countBy({ code: `legacy-${member.id}` }),
    1,
  );
  assert.equal(
    await db.getRepository(UserRole).countBy({ userId: member.id }),
    1,
  );
  console.log(
    'PASS 空库 M0 → 授权迁移及账号规范化；原权限、本人范围和初始化管理员身份保留，普通账号未提权',
  );
} finally {
  await db.destroy();
}
