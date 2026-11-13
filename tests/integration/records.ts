import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import {
  Audit,
  DemoRecord,
  require,
  type IntegrationContext,
} from '../helpers/integration-context';
export async function runRecords(context: IntegrationContext) {
  const { call, user, check, db, app, run } = context;
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
  let id = '';
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
}
