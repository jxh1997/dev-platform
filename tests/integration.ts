import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';

if (!process.env.CI) config({ path: '.env.test', override: true, quiet: true });
if (
  process.env.APP_ENV !== 'test' ||
  process.env.INSTANCE_ID !== 'dev-platform-test' ||
  process.env.DB_DATABASE !== 'dev_platform_test' ||
  process.env.DB_USERNAME !== 'devplatform_test' ||
  !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST ?? '')
) {
  throw new Error(
    '拒绝执行：需 APP_ENV=test、专用实例 dev-platform-test、数据库 dev_platform_test、专用账号 devplatform_test 与本机测试目标',
  );
}
const require = createRequire(import.meta.url);
const { createDataSource, User, UserPermission, DemoRecord, Audit, Session } =
  require('../dist/packages/database/src') as typeof import('../packages/database/src');
const { createApplication, closeApplication } =
  require('../dist/apps/server/src/application.js') as typeof import('../apps/server/src/application');
const db = await createDataSource().initialize();
await db.runMigrations({ transaction: 'each' });
const app = await createApplication();
await app.listen(0, '127.0.0.1');
const base = `${await app.getUrl()}/api/v1`;
const run = randomUUID().slice(0, 8);
const password = randomUUID() + 'Z9!';
const userIds: string[] = [];
let checks = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  checks++;
  console.log(`PASS ${name}`);
}
async function call(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    cookie?: string;
    origin?: string;
    key?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const response = await fetch(base + path, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      Origin: options.origin ?? process.env.APP_ORIGIN!,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.key ? { 'Idempotency-Key': options.key } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const body = await response.json();
  return {
    status: response.status,
    body,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
async function user(
  label: string,
  grants: Record<string, 'ALL' | 'SELF'>,
  mustChangePassword = false,
) {
  const record = await db.getRepository(User).save({
    username: `${run}_${label}`,
    realName: label,
    passwordHash: await hash(password, 12),
    enabled: true,
    securityVersion: 1,
    mustChangePassword,
  });
  userIds.push(record.id);
  for (const [action, scope] of Object.entries(grants))
    await db
      .getRepository(UserPermission)
      .save({ userId: record.id, code: `demo:record:${action}`, scope });
  const result = await call('/auth/login', {
    body: { username: record.username, password },
  });
  assert.equal(result.status, 200);
  return {
    ...record,
    token: result.body.data.accessToken as string,
    cookie: result.cookie!,
  };
}
try {
  await db.runMigrations({ transaction: 'each' });
  assert.equal(await db.showMigrations(), false);
  const admin = await user('admin', {
    list: 'ALL',
    read: 'ALL',
    create: 'ALL',
    update: 'ALL',
    delete: 'ALL',
  });
  const member = await user('member', {
    list: 'ALL',
    read: 'SELF',
    create: 'SELF',
    update: 'SELF',
    delete: 'SELF',
  });
  const viewer = await user('viewer', { list: 'SELF' });
  const initial = await user('initial', { list: 'ALL' }, true);
  let id = '';
  await check('健康检查、未登录拒绝和统一响应', async () => {
    assert.equal((await call('/health/ready')).status, 200);
    const r = await call('/demo/records');
    assert.equal(r.status, 401);
    assert.ok(r.body.requestId);
    assert.equal(r.body.data, null);
  });
  await check('JSON 解析与请求体限制返回明确错误', async () => {
    for (const [body, status] of [
      ['{', 400],
      [JSON.stringify({ value: 'x'.repeat(1024 * 1024) }), 413],
    ] as const) {
      const response = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      assert.equal(response.status, status);
      const error = await response.json();
      assert.ok(error.requestId);
      assert.equal(
        error.businessCode,
        status === 413 ? 'PAYLOAD_TOO_LARGE' : 'VALIDATION_FAILED',
      );
    }
  });
  await check('GET/POST 白名单及方法覆盖拒绝', async () => {
    for (const method of ['PUT', 'DELETE', 'PATCH'])
      assert.equal(
        (
          await call('/demo/records/1', {
            method,
            token: admin.token,
            body: { version: 1 },
          })
        ).status,
        405,
      );
    assert.equal(
      (
        await call('/demo/records', {
          token: admin.token,
          headers: { 'X-HTTP-Method-Override': 'DELETE' },
        })
      ).status,
      405,
    );
  });
  await check('真实身份、菜单与当前权限', async () => {
    const me = await call('/auth/me', { token: admin.token });
    assert.equal(me.body.data.userId, admin.id);
    assert.equal(typeof me.body.data.userId, 'string');
    assert.equal(
      (await call('/auth/menus', { token: admin.token })).body.data[0].path,
      '/demo/records',
    );
    assert.equal(
      (await call('/auth/permissions', { token: admin.token })).body.data
        .length,
      5,
    );
  });
  await check('强制改密和缺少功能权限拒绝', async () => {
    assert.equal(
      (await call('/demo/records', { token: initial.token })).body.businessCode,
      'AUTH_PASSWORD_CHANGE_REQUIRED',
    );
    assert.equal(
      (
        await call('/demo/records', {
          token: viewer.token,
          body: { code: 'NO', name: 'no' },
          key: randomUUID(),
        })
      ).status,
      403,
    );
  });
  await check('输入白名单、分页、null 与未知字段校验', async () => {
    for (const query of ['page=1e2', 'page=0', 'pageSize=101', 'unknown=1'])
      assert.equal(
        (await call(`/demo/records?${query}`, { token: admin.token })).status,
        400,
      );
    for (const body of [
      { code: 'BAD', name: null },
      { code: 'BAD', name: '测试', status: null },
      { code: 'BAD', name: '测试', createdBy: member.id },
    ])
      assert.equal(
        (
          await call('/demo/records', {
            token: admin.token,
            body,
            key: randomUUID(),
          })
        ).status,
        400,
      );
  });
  const input = {
    code: `TEST-${run.toUpperCase()}`,
    name: '工程验证设备',
    remark: '原备注',
  };
  const key = randomUUID();
  await check('并发幂等新增与成功审计同事务', async () => {
    const [a, b] = await Promise.all([
      call('/demo/records', { token: admin.token, body: input, key }),
      call('/demo/records', { token: admin.token, body: input, key }),
    ]);
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    id = a.body.data.id;
    assert.equal(id, b.body.data.id);
    assert.equal(
      await db.getRepository(Audit).countBy({
        userId: admin.id,
        action: 'demo:record:create',
        resourceId: id,
      }),
      1,
    );
    assert.equal(
      (
        await call('/demo/records', {
          token: admin.token,
          body: { ...input, name: '不同' },
          key,
        })
      ).body.businessCode,
      'IDEMPOTENCY_CONFLICT',
    );
  });
  await check('本人范围与全量查看不扩大修改权限', async () => {
    assert.equal(
      (await call('/demo/records', { token: member.token })).body.data.total,
      1,
    );
    assert.equal(
      (await call(`/demo/records/${id}`, { token: member.token })).status,
      404,
    );
    assert.equal(
      (
        await call(`/demo/records/${id}/update`, {
          token: member.token,
          body: { version: 1, name: '越权' },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await call(`/demo/records/${id}/delete`, {
          token: member.token,
          body: { version: 1 },
        })
      ).status,
      404,
    );
    assert.equal(
      (await call('/demo/records', { token: viewer.token })).body.data.total,
      0,
    );
  });
  await check('并发版本冲突与未传字段保留', async () => {
    const results = await Promise.all(
      ['甲', '乙'].map((name) =>
        call(`/demo/records/${id}/update`, {
          token: admin.token,
          body: { version: 1, name },
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    assert.equal(
      (await call(`/demo/records/${id}`, { token: admin.token })).body.data
        .remark,
      '原备注',
    );
    assert.equal(
      (
        await call(`/demo/records/${id}/update`, {
          token: admin.token,
          body: { version: 2 },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(`/demo/records/${id}/update`, {
          token: admin.token,
          body: { version: 2, name: null },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(`/demo/records/${id}/update`, {
          token: admin.token,
          body: { version: 2, remark: null },
        })
      ).body.data.remark,
      null,
    );
  });
  await check('审计失败时业务更新回滚', async () => {
    const ds = app.get(
      require('typeorm').DataSource,
    ) as import('typeorm').DataSource;
    const original = ds.createQueryRunner.bind(ds);
    ds.createQueryRunner = (...args) => {
      const runner = original(...args);
      const query = runner.query.bind(runner);
      runner.query = async (...params: Parameters<typeof query>) => {
        if (/INSERT INTO `?sys_audit/.test(String(params[0])))
          throw new Error('test-only audit failure');
        return query(...params);
      };
      return runner;
    };
    try {
      assert.equal(
        (
          await call(`/demo/records/${id}/update`, {
            token: admin.token,
            body: { version: 3, name: '不应保存' },
          })
        ).status,
        500,
      );
    } finally {
      ds.createQueryRunner = original;
    }
    const r = await call(`/demo/records/${id}`, { token: admin.token });
    assert.equal(r.body.data.version, 3);
    assert.notEqual(r.body.data.name, '不应保存');
  });
  await check('BIGINT、DECIMAL 和 UTC 时刻往返无损', async () => {
    const rows = await db.query(
      "SELECT CAST('9007199254740993' AS UNSIGNED) AS id, CAST('123456789012345.67' AS DECIMAL(20,2)) AS amount",
    );
    assert.equal(rows[0].id, '9007199254740993');
    assert.equal(rows[0].amount, '123456789012345.67');
    const now = new Date('2026-11-10T00:00:00.123Z');
    await db.getRepository(DemoRecord).insert({
      id: '9007199254740993',
      code: `BIG-${run.toUpperCase()}`,
      name: '大整数主键',
      status: 'enabled',
      remark: null,
      createdBy: admin.id,
      updatedBy: admin.id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const created = await call('/demo/records', {
      token: admin.token,
      key: randomUUID(),
      body: { code: `AUTO-${run.toUpperCase()}`, name: '大整数自增主键' },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const generated = created.body.data;
    assert.equal(typeof generated.id, 'string');
    assert.ok(BigInt(generated.id) > 9007199254740993n);
    const roundtrip = await call(`/demo/records/${generated.id}`, {
      token: admin.token,
    });
    assert.equal(roundtrip.status, 200, JSON.stringify(roundtrip.body));
    assert.equal(roundtrip.body.data.id, generated.id);
    const stored = await db
      .getRepository(DemoRecord)
      .findOneByOrFail({ code: `AUTO-${run.toUpperCase()}` });
    assert.equal(roundtrip.body.data.id, stored.id);
    assert.equal(roundtrip.body.data.createdAt, stored.createdAt.toISOString());

    const item = await db.getRepository(DemoRecord).findOneByOrFail({ id });
    const api = await call(`/demo/records/${id}`, { token: admin.token });
    assert.equal(api.body.data.createdAt, item.createdAt.toISOString());
  });
  await check('软删除、版本检查和唯一编码保留', async () => {
    assert.equal(
      (
        await call(`/demo/records/${id}/delete`, {
          token: admin.token,
          body: { version: 2 },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(`/demo/records/${id}/delete`, {
          token: admin.token,
          body: { version: 3 },
        })
      ).status,
      200,
    );
    assert.equal(
      (await call(`/demo/records/${id}`, { token: admin.token })).status,
      404,
    );
    assert.equal(
      (
        await call('/demo/records', {
          token: admin.token,
          body: input,
          key: randomUUID(),
        })
      ).status,
      409,
    );
  });
  await check('过期 Access 的明确业务码', async () => {
    const session = await db
      .getRepository(Session)
      .findOneByOrFail({ userId: member.id });
    const expired = jwt.sign(
      { sub: member.id, sid: session.id, sv: 1 },
      process.env.JWT_SECRET!,
      {
        algorithm: 'HS256',
        expiresIn: -1,
        issuer: process.env.INSTANCE_ID!,
        audience: 'dev-platform-admin',
      },
    );
    assert.equal(
      (await call('/auth/me', { token: expired })).body.businessCode,
      'AUTH_ACCESS_EXPIRED',
    );
  });
  await check('刷新来源校验、轮换与旧令牌复用撤销', async () => {
    assert.equal(
      (
        await call('/auth/refresh', {
          body: {},
          cookie: member.cookie,
          origin: 'https://untrusted.invalid',
        })
      ).status,
      403,
    );
    const fresh = await call('/auth/refresh', {
      body: {},
      cookie: member.cookie,
    });
    assert.equal(fresh.status, 200);
    assert.equal(
      (await call('/auth/refresh', { body: {}, cookie: member.cookie })).status,
      401,
    );
    assert.equal(
      (await call('/auth/me', { token: fresh.body.data.accessToken })).body
        .businessCode,
      'AUTH_SESSION_REVOKED',
    );
  });
  await check('密码长度边界与历史密码兼容', async () => {
    for (const value of ['12345', '1234567890123']) {
      assert.equal(
        (
          await call('/auth/password', {
            token: initial.token,
            body: { currentPassword: password, newPassword: value },
          })
        ).status,
        400,
      );
    }
    const changed = await call('/auth/password', {
      token: initial.token,
      body: { currentPassword: password, newPassword: '123456' },
    });
    assert.equal(changed.status, 200);
    const signed = await call('/auth/login', {
      body: { username: initial.username, password: '123456' },
    });
    assert.equal(signed.status, 200);
    initial.token = signed.body.data.accessToken;
  });
  await check('改密撤销旧会话、退出撤销', async () => {
    assert.equal(
      (
        await call('/auth/password', {
          token: initial.token,
          body: {
            currentPassword: '123456',
            newPassword: randomUUID().slice(0, 12),
          },
        })
      ).status,
      200,
    );
    assert.equal(
      (await call('/auth/me', { token: initial.token })).status,
      401,
    );
    assert.equal(
      (await call('/auth/logout', { token: admin.token, body: {} })).status,
      200,
    );
    assert.equal((await call('/auth/me', { token: admin.token })).status, 401);
  });
  console.log(`真实 MySQL 集成验证：${checks} 组通过`);
} finally {
  await closeApplication(app);
  // 仅清理本次随机用户及其派生数据，不清空整库。
  for (const id of userIds) {
    await db.query('DELETE FROM sys_idempotency WHERE user_id = ?', [id]);
    await db.query('DELETE FROM sys_audit WHERE user_id = ?', [id]);
    await db.getRepository(DemoRecord).delete({ createdBy: id });
    await db.getRepository(Session).delete({ userId: id });
    await db.getRepository(UserPermission).delete({ userId: id });
    await db.getRepository(User).delete({ id });
  }
  await db.destroy();
}
