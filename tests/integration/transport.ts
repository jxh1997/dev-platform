import { strict as assert } from 'node:assert';
import type { IntegrationContext } from '../helpers/integration-context';
export async function runTransport(context: IntegrationContext) {
  const { call, base, user, check } = context;
  const admin = await user('admin', {
    list: 'ALL',
    read: 'ALL',
    create: 'ALL',
    update: 'ALL',
    delete: 'ALL',
  });
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
}
