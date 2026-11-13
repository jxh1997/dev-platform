import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { hash } from 'bcryptjs';

export function assertTestEnvironment() {
  if (!process.env.CI)
    config({ path: '.env.test', override: true, quiet: true });
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
}

assertTestEnvironment();
export const require = createRequire(import.meta.url);
export const {
  createDataSource,
  User,
  UserPermission,
  DemoRecord,
  Audit,
  Session,
  Role,
  UserRole,
  RolePermission,
  RoleMenu,
  Menu,
} =
  require('../../dist/packages/database/src') as typeof import('../../packages/database/src');
const { createApplication, closeApplication } =
  require('../../dist/apps/server/src/application.js') as typeof import('../../apps/server/src/application');

async function createFixture(
  db: ReturnType<typeof createDataSource>,
  app: Awaited<ReturnType<typeof createApplication>>,
) {
  const base = `${await app.getUrl()}/api/v1`;
  const run = randomUUID().slice(0, 8);
  const password = randomUUID() + 'Z9!';
  const userIds: string[] = [];
  const roleIds: string[] = [];
  const completed: string[] = [];
  async function check(name: string, fn: () => Promise<void>) {
    await fn();
    completed.push(name);
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
  ): Promise<{
    status: number;
    body: Awaited<ReturnType<Response['json']>>;
    cookie: string | undefined;
  }> {
    let payload = options.body;
    let browserCookie = options.cookie;
    if (
      path === '/auth/login' &&
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      !('captchaToken' in payload)
    ) {
      const challenge = await call('/auth/captcha/challenge', { body: {} });
      assert.equal(challenge.status, 200);
      await new Promise((resolve) => setTimeout(resolve, 450));
      const verified = await call('/auth/captcha/verify', {
        body: { challengeId: challenge.body.data.challengeId, progress: 100 },
        cookie: challenge.cookie,
      });
      assert.equal(verified.status, 200);
      payload = { ...payload, captchaToken: verified.body.data.captchaToken };
      browserCookie = [browserCookie, challenge.cookie]
        .filter(Boolean)
        .join('; ');
    }
    const response = await fetch(base + path, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        Origin: options.origin ?? process.env.APP_ORIGIN!,
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(browserCookie ? { Cookie: browserCookie } : {}),
        ...(options.key ? { 'Idempotency-Key': options.key } : {}),
        ...options.headers,
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
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
    const code = `test-${run}-${label}`;
    await db.getRepository(Role).insert({
      code,
      name: label,
      enabled: true,
      isSuperAdmin: false,
      version: 1,
    });
    const role = await db.getRepository(Role).findOneByOrFail({ code });
    roleIds.push(role.id);
    await db
      .getRepository(UserRole)
      .insert({ userId: record.id, roleId: role.id });
    for (const [action, scope] of Object.entries(grants))
      await db
        .getRepository(RolePermission)
        .insert({ roleId: role.id, code: `demo:record:${action}`, scope });
    const menu = await db
      .getRepository(Menu)
      .findOneByOrFail({ code: 'records' });
    await db
      .getRepository(RoleMenu)
      .insert({ roleId: role.id, menuId: menu.id });
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

  return {
    db,
    app,
    base,
    run,
    password,
    userIds,
    roleIds,
    completed,
    check,
    call,
    user,
  };
}
export type IntegrationContext = Awaited<ReturnType<typeof createFixture>>;

export async function withIntegrationContext(
  suite: (context: IntegrationContext) => Promise<void>,
): Promise<string[]> {
  assertTestEnvironment();
  const db = createDataSource();
  let app: Awaited<ReturnType<typeof createApplication>> | undefined;
  let context: IntegrationContext | undefined;
  const errors: unknown[] = [];
  async function attempt(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      errors.push(error);
    }
  }
  try {
    await db.initialize();
    await db.runMigrations({ transaction: 'each' });
    assert.equal(await db.showMigrations(), false);
    app = await createApplication();
    await app.listen(0, '127.0.0.1');
    context = await createFixture(db, app);
    await suite(context);
    assert.ok(context.completed.length > 0, '拒绝零用例成功');
  } catch (error) {
    errors.push(error);
  } finally {
    const runningApp = app;
    if (runningApp) await attempt(() => closeApplication(runningApp));
    if (context && db.isInitialized) {
      // 只清理本次随机用户及其派生数据；单项失败不跳过后续资源释放。
      for (const id of context.userIds) {
        await attempt(() =>
          db.query('DELETE FROM sys_idempotency WHERE user_id = ?', [id]),
        );
        await attempt(() =>
          db.query('DELETE FROM sys_audit WHERE user_id = ?', [id]),
        );
        await attempt(() =>
          db.getRepository(DemoRecord).delete({ createdBy: id }),
        );
        await attempt(() => db.getRepository(Session).delete({ userId: id }));
        await attempt(() =>
          db.getRepository(UserPermission).delete({ userId: id }),
        );
        await attempt(() => db.getRepository(UserRole).delete({ userId: id }));
        await attempt(() => db.getRepository(User).delete({ id }));
      }
      for (const id of context.roleIds) {
        await attempt(() =>
          db.getRepository(RolePermission).delete({ roleId: id }),
        );
        await attempt(() => db.getRepository(RoleMenu).delete({ roleId: id }));
        await attempt(() => db.getRepository(Role).delete({ id }));
      }
    }
    if (db.isInitialized) await attempt(() => db.destroy());
  }
  if (errors.length) throw new AggregateError(errors, '集成验证或夹具清理失败');
  assert.ok(context);
  return context.completed;
}
