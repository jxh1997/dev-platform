import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  Role,
  UserRole,
  RolePermission,
  Menu,
  Session,
  Audit,
  require,
  type IntegrationContext,
} from '../helpers/integration-context';
export async function runIdentity(context: IntegrationContext) {
  const { call, user, check, db, app, run, password, base, userIds, roleIds } =
    context;
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
  await check(
    '登录滑块缺失、伪造、跨浏览器、错误密码消耗和并发重放拒绝',
    async () => {
      const captchaUser = await user('captcha', { list: 'SELF' });
      const raw = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: process.env.APP_ORIGIN!,
        },
        body: JSON.stringify({ username: captchaUser.username, password }),
      });
      assert.equal(raw.status, 400);
      const forged = await call('/auth/login', {
        body: {
          username: captchaUser.username,
          password,
          captchaToken: 'x'.repeat(43),
        },
      });
      assert.equal(forged.body.businessCode, 'AUTH_CAPTCHA_INVALID');
      async function proof() {
        const c = await call('/auth/captcha/challenge', { body: {} });
        await new Promise((resolve) => setTimeout(resolve, 450));
        const v = await call('/auth/captcha/verify', {
          cookie: c.cookie,
          body: { challengeId: c.body.data.challengeId, progress: 100 },
        });
        assert.equal(v.status, 200);
        return {
          captchaToken: v.body.data.captchaToken as string,
          cookie: c.cookie,
        };
      }
      const first = await proof();
      const body = {
        username: captchaUser.username,
        password,
        captchaToken: first.captchaToken,
      };
      assert.equal((await call('/auth/login', { body })).status, 403);
      assert.equal(
        (
          await call('/auth/login', {
            cookie: first.cookie,
            body: { ...body, password: 'wrong-password' },
          })
        ).status,
        401,
      );
      assert.equal(
        (await call('/auth/login', { cookie: first.cookie, body })).status,
        403,
      );
      const second = await proof();
      const concurrent = await Promise.all(
        [0, 1].map(() =>
          call('/auth/login', {
            cookie: second.cookie,
            body: { ...body, captchaToken: second.captchaToken },
          }),
        ),
      );
      assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 403]);
      assert.equal(
        (
          await call('/auth/captcha/challenge', {
            body: {},
            origin: 'https://untrusted.example',
          })
        ).status,
        403,
      );
    },
  );
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

  // 管理链路由 API 创建与授权，fixture 仅建立隔离的初始超级管理员。
  const root = await user('security_root', {});
  const root2 = await user('security_backup', {});
  const superRole = await db
    .getRepository(Role)
    .findOneByOrFail({ code: 'super-admin' });
  await db.getRepository(UserRole).insert([
    { userId: root.id, roleId: superRole.id },
    { userId: root2.id, roleId: superRole.id },
  ]);
  const get = (path: string) => call(path, { token: root.token });
  const post = (path: string, body: unknown) =>
    call(path, { token: root.token, body, key: randomUUID() });
  const ok = (r: Awaited<ReturnType<typeof call>>, status = 200) =>
    assert.equal(r.status, status, JSON.stringify(r.body));
  const makeRole = async (label: string) => {
    const r = await post('/system/roles', {
      code: `authz-${run}-${label}`,
      name: `验证角色 ${label}`,
    });
    ok(r, 201);
    roleIds.push(r.body.data.id);
    return r.body.data;
  };
  const creationInput = {
    username: `  ${run}_AUTHZ  `,
    realName: '授权验证账号',
    password: 'Test123!',
  };
  const creationKey = randomUUID();
  const [created, duplicate] = await Promise.all([
    call('/system/users', {
      token: root.token,
      body: creationInput,
      key: creationKey,
    }),
    call('/system/users', {
      token: root.token,
      body: creationInput,
      key: creationKey,
    }),
  ]);
  ok(created, 201);
  ok(duplicate, 201);
  assert.equal(created.body.data.id, duplicate.body.data.id);
  const managedId = created.body.data.id as string;
  userIds.push(managedId);
  let managedVersion = created.body.data.version as number;
  await check('用户新增并发幂等及审计白名单', async () => {
    assert.equal(
      (
        await call('/system/users', {
          token: root.token,
          body: { ...creationInput, realName: '不同内容' },
          key: creationKey,
        })
      ).status,
      409,
    );
    const audits = await db.getRepository(Audit).findBy({
      userId: root.id,
      action: 'system:user:create',
      resourceId: managedId,
    });
    assert.equal(audits.length, 1);
    const serialized = JSON.stringify(audits[0]!.details);
    assert.equal(serialized.includes('Test123!'), false);
    assert.equal(serialized.includes('passwordHash'), false);
    assert.ok(serialized.includes(managedId));
  });
  const managedName = `${run}_authz`;
  const viewRole = await makeRole('view'),
    editRole = await makeRole('edit');
  const recordsMenu = await db
    .getRepository(Menu)
    .findOneByOrFail({ code: 'records' });
  let roleVersion = 1;
  await check('全部系统路由：未登录 401、普通业务账号直连 403', async () => {
    const { openapi } =
      require('../../dist/apps/server/src/application.js') as typeof import('../../apps/server/src/application');
    for (const [path, item] of Object.entries(openapi(app).paths)) {
      if (!path.startsWith('/api/v1/system/')) continue;
      for (const method of ['get', 'post'] as const) {
        if (!item?.[method]) continue;
        const url = path.replace('/api/v1', '').replace('{id}', root.id);
        const options = {
          method: method.toUpperCase(),
          ...(method === 'post' ? { body: {} } : {}),
        };
        assert.equal(
          (await call(url, options)).status,
          401,
          `${method} ${path}`,
        );
        assert.equal(
          (await call(url, { ...options, token: viewer.token })).status,
          403,
          `${method} ${path}`,
        );
      }
    }
  });
  await check(
    '用户白名单、标准化唯一、普通账号禁止授权及管理越权',
    async () => {
      assert.equal(created.body.data.username, managedName);
      assert.equal('passwordHash' in created.body.data, false);
      assert.equal(
        (
          await post('/system/users', {
            username: managedName.toUpperCase(),
            realName: '重复',
            password: 'Test123!',
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await post('/system/users', {
            username: `${run}_fake`,
            realName: '伪造',
            password: 'Test123!',
            isSuperAdmin: true,
          })
        ).status,
        400,
      );
      assert.equal(
        (await call('/system/users', { token: viewer.token })).status,
        403,
      );
      assert.equal(
        (
          await call(`/system/users/${root.id}/assign-role`, {
            token: viewer.token,
            body: { version: 1, roleIds: [superRole.id] },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call('/system/roles', {
            token: viewer.token,
            body: { code: `evil-${run}`, name: '越权' },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await post(`/system/roles/${editRole.id}/grants`, {
            version: 1,
            permissions: [{ code: 'system:user:assign-role', scope: 'ALL' }],
            menuIds: [],
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await post(`/system/roles/${editRole.id}/grants`, {
            version: 1,
            permissions: [{ code: 'invented:permission:run', scope: 'ALL' }],
            menuIds: [],
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await post(`/system/roles/${editRole.id}/grants`, {
            version: 1,
            permissions: [{ code: 'demo:record:update', scope: 'DEPT' }],
            menuIds: [],
          })
        ).status,
        400,
      );
    },
  );
  ok(
    await post(`/system/roles/${viewRole.id}/grants`, {
      version: 1,
      permissions: [
        { code: 'demo:record:list', scope: 'ALL' },
        { code: 'demo:record:read', scope: 'ALL' },
      ],
      menuIds: [recordsMenu.id],
    }),
  );
  ok(
    await post(`/system/roles/${editRole.id}/grants`, {
      version: 1,
      permissions: [
        { code: 'demo:record:create', scope: 'SELF' },
        { code: 'demo:record:update', scope: 'SELF' },
        { code: 'demo:record:delete', scope: 'SELF' },
      ],
      menuIds: [],
    }),
  );
  const assigned = await post(`/system/users/${managedId}/assign-role`, {
    version: managedVersion,
    roleIds: [viewRole.id, editRole.id],
  });
  ok(assigned);
  managedVersion = assigned.body.data.version;
  const initialLogin = await call('/auth/login', {
    body: { username: managedName, password: 'Test123!' },
  });
  ok(initialLogin);
  ok(
    await call('/auth/password', {
      token: initialLogin.body.data.accessToken,
      body: { currentPassword: 'Test123!', newPassword: 'Next123!' },
    }),
  );
  managedVersion++;
  const signed = await call('/auth/login', {
    body: { username: managedName, password: 'Next123!' },
  });
  ok(signed);
  const managedToken = signed.body.data.accessToken as string;
  const owned = await call('/demo/records', {
    token: managedToken,
    key: randomUUID(),
    body: { code: `OWN-${run.toUpperCase()}`, name: '本人设备' },
  });
  ok(owned, 201);
  const foreign = await call('/demo/records', {
    token: root.token,
    key: randomUUID(),
    body: { code: `FOREIGN-${run.toUpperCase()}`, name: '其他人设备' },
  });
  ok(foreign, 201);
  await check(
    '多角色按操作合并：全量查看不能扩大本人修改，绕过页面仍受限',
    async () => {
      const me = await call('/auth/me', { token: managedToken });
      ok(me);
      assert.equal(me.body.data.roles.length, 2);
      assert.equal(me.body.data.isSuperAdmin, false);
      ok(
        await call(`/demo/records/${foreign.body.data.id}`, {
          token: managedToken,
        }),
      );
      assert.equal(
        (
          await call(`/demo/records/${foreign.body.data.id}/update`, {
            token: managedToken,
            body: { version: 1, name: '越权' },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await call(`/demo/records/${foreign.body.data.id}/delete`, {
            token: managedToken,
            body: { version: 1 },
          })
        ).status,
        404,
      );
      ok(
        await call(`/demo/records/${owned.body.data.id}/update`, {
          token: managedToken,
          body: { version: 1, name: '本人修改成功' },
        }),
      );
      assert.equal(
        (await call('/system/permissions', { token: managedToken })).status,
        403,
      );
      assert.equal(
        (await call('/system/menus', { token: managedToken })).status,
        403,
      );
    },
  );
  await check(
    '停用角色、替换用户角色后原 Access 即时按新授权拒绝',
    async () => {
      ok(
        await post(`/system/roles/${editRole.id}/update`, {
          version: 2,
          enabled: false,
        }),
      );
      assert.equal(
        (
          await call('/demo/records', {
            token: managedToken,
            key: randomUUID(),
            body: { code: `DENY-${run}`, name: '无权新增' },
          })
        ).status,
        403,
      );
      ok(
        await post(`/system/roles/${editRole.id}/update`, {
          version: 3,
          enabled: true,
        }),
      );
      const removed = await post(`/system/users/${managedId}/assign-role`, {
        version: managedVersion,
        roleIds: [viewRole.id],
      });
      ok(removed);
      managedVersion = removed.body.data.version;
      assert.equal(
        (
          await call('/demo/records', {
            token: managedToken,
            key: randomUUID(),
            body: { code: `DENY-${run}`, name: '无权新增' },
          })
        ).status,
        403,
      );
      const restored = await post(`/system/users/${managedId}/assign-role`, {
        version: managedVersion,
        roleIds: [viewRole.id, editRole.id],
      });
      ok(restored);
      managedVersion = restored.body.data.version;
      assert.ok(
        (
          await call('/auth/permissions', { token: managedToken })
        ).body.data.includes('demo:record:create'),
      );
    },
  );
  await check(
    '菜单与接口权限独立：仅导航不授予 API，移除导航不撤销 API',
    async () => {
      const granted = await post(`/system/roles/${viewRole.id}/grants`, {
        version: 2,
        permissions: [{ code: 'demo:record:list', scope: 'ALL' }],
        menuIds: [],
      });
      ok(granted);
      roleVersion = granted.body.data.version;
      const menu = await call('/auth/menus', { token: managedToken });
      ok(menu);
      assert.equal(
        menu.body.data.some(
          (m: { path: string }) => m.path === '/demo/records',
        ),
        false,
      );
      ok(await call('/demo/records', { token: managedToken }));
      const next = await post(`/system/roles/${viewRole.id}/grants`, {
        version: roleVersion,
        permissions: [],
        menuIds: [recordsMenu.id],
      });
      ok(next);
      roleVersion = next.body.data.version;
      assert.equal(
        (await call('/demo/records', { token: managedToken })).status,
        403,
      );
      assert.equal(
        (await call('/auth/menus', { token: managedToken })).body.data.some(
          (m: { path: string }) => m.path === '/demo/records',
        ),
        false,
      );
      assert.equal(
        (await call('/auth/me', { token: managedToken })).body.data.homePath,
        '/account/sessions',
      );
    },
  );
  await check('普通管理员不能管理管理员或通过自我角色变更提权', async () => {
    const granted = await post(`/system/roles/${viewRole.id}/grants`, {
      version: roleVersion,
      permissions: [
        { code: 'system:user:list', scope: 'ALL' },
        { code: 'system:user:update', scope: 'ALL' },
      ],
      menuIds: [],
    });
    ok(granted);
    roleVersion = granted.body.data.version;
    const list = await call('/system/users', { token: managedToken });
    ok(list);
    assert.equal(
      list.body.data.list.some((u: { id: string }) => u.id === root.id),
      false,
    );
    assert.equal(
      (
        await call(`/system/users/${root.id}/update`, {
          token: managedToken,
          body: { version: 1, enabled: false },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(`/system/users/${managedId}/assign-role`, {
          token: managedToken,
          body: { version: managedVersion, roleIds: [superRole.id] },
        })
      ).status,
      403,
    );
  });
  await check('菜单白名单、危险外链、循环、深度与引用删除校验', async () => {
    const dto = {
      code: `menu-${run}`,
      name: `TestMenu${run}`,
      path: `/test-${run}`,
      title: '测试目录',
      component: '',
      permission: '',
      parentId: null,
      type: 'directory',
      sort: 100,
      visible: true,
      enabled: true,
    };
    const directory = await post('/system/menus', dto);
    ok(directory, 201);
    const mid = directory.body.data.id;
    try {
      assert.equal(
        (
          await post(`/system/menus/${mid}/update`, {
            ...dto,
            code: undefined,
            parentId: mid,
            version: 1,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await post('/system/menus', {
            ...dto,
            code: `bad-${run}`,
            name: `Bad${run}`,
            type: 'page',
            component: '/arbitrary/remote',
            permission: 'demo:record:list',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await post('/system/menus', {
            ...dto,
            code: `link-${run}`,
            name: `Link${run}`,
            type: 'link',
            path: 'javascript:alert(1)',
            permission: 'demo:record:list',
          })
        ).status,
        400,
      );
      const children: string[] = [];
      let parentId = mid;
      for (let depth = 2; depth <= 5; depth++) {
        const child = await post('/system/menus', {
          ...dto,
          code: `depth-${run}-${depth}`,
          name: `Depth${run}${depth}`,
          path: `/depth-${run}-${depth}`,
          parentId,
        });
        ok(child, 201);
        parentId = child.body.data.id;
        children.push(parentId);
      }
      try {
        assert.equal(
          (
            await post('/system/menus', {
              ...dto,
              code: `deep-${run}`,
              name: `Deep${run}`,
              path: `/deep-${run}`,
              parentId,
            })
          ).status,
          400,
        );
        assert.equal(
          (await post(`/system/menus/${mid}/delete`, { version: 1 })).status,
          409,
        );
      } finally {
        for (const child of children.reverse())
          ok(await post(`/system/menus/${child}/delete`, { version: 1 }));
      }
      assert.equal(
        (
          await post(`/system/menus/${recordsMenu.id}/delete`, {
            version: recordsMenu.version,
          })
        ).status,
        409,
      );
    } finally {
      ok(await post(`/system/menus/${mid}/delete`, { version: 1 }));
    }
  });
  await check('用户并发版本、会话所有者与撤销即时生效', async () => {
    const results = await Promise.all(
      ['甲', '乙'].map((realName) =>
        post(`/system/users/${managedId}/update`, {
          version: managedVersion,
          realName,
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    managedVersion++;
    const sessions = await call('/auth/sessions', { token: managedToken });
    ok(sessions);
    assert.equal('refreshHash' in sessions.body.data[0], false);
    const rootSession = (
      await get(`/system/users/${root.id}/sessions`)
    ).body.data.find((s: { current: boolean }) => s.current);
    assert.equal(
      (
        await call('/auth/sessions/revoke', {
          token: managedToken,
          body: { sessionId: rootSession.id },
        })
      ).status,
      404,
    );
    ok(
      await post(`/system/users/${managedId}/revoke-session`, {
        sessionId: sessions.body.data.find(
          (s: { current: boolean }) => s.current,
        ).id,
      }),
    );
    assert.equal((await call('/auth/me', { token: managedToken })).status, 401);
    assert.equal(
      (await call('/auth/refresh', { cookie: signed.cookie, body: {} })).status,
      401,
    );
  });
  await check(
    '禁用与重置撤销 Access 和 Refresh，重置用户强制改密',
    async () => {
      let login = await call('/auth/login', {
        body: { username: managedName, password: 'Next123!' },
      });
      ok(login);
      const disabled = await post(`/system/users/${managedId}/update`, {
        version: managedVersion,
        enabled: false,
      });
      ok(disabled);
      managedVersion++;
      assert.equal(
        (await call('/auth/me', { token: login.body.data.accessToken })).status,
        401,
      );
      assert.equal(
        (await call('/auth/refresh', { cookie: login.cookie, body: {} }))
          .status,
        401,
      );
      assert.equal(
        (
          await call('/auth/login', {
            body: { username: managedName, password: 'Next123!' },
          })
        ).status,
        401,
      );
      ok(
        await post(`/system/users/${managedId}/update`, {
          version: managedVersion,
          enabled: true,
        }),
      );
      managedVersion++;
      login = await call('/auth/login', {
        body: { username: managedName, password: 'Next123!' },
      });
      ok(login);
      ok(
        await post(`/system/users/${managedId}/reset-password`, {
          version: managedVersion,
          password: 'Reset123!',
        }),
      );
      managedVersion++;
      assert.equal(
        (await call('/auth/me', { token: login.body.data.accessToken })).status,
        401,
      );
      assert.equal(
        (await call('/auth/refresh', { cookie: login.cookie, body: {} }))
          .status,
        401,
      );
      const reset = await call('/auth/login', {
        body: { username: managedName, password: 'Reset123!' },
      });
      ok(reset);
      assert.equal(
        (await call('/auth/me', { token: reset.body.data.accessToken })).body
          .data.mustChangePassword,
        true,
      );
      assert.equal(
        (await call('/demo/records', { token: reset.body.data.accessToken }))
          .body.businessCode,
        'AUTH_PASSWORD_CHANGE_REQUIRED',
      );
    },
  );
  await check('关联角色不可删除，授权变更与审计同事务', async () => {
    assert.equal(
      (
        await post(`/system/roles/${viewRole.id}/delete`, {
          version: roleVersion,
        })
      ).status,
      409,
    );
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
          await post(`/system/roles/${viewRole.id}/grants`, {
            version: roleVersion,
            permissions: [],
            menuIds: [],
          })
        ).status,
        500,
      );
    } finally {
      ds.createQueryRunner = original;
    }
    const role = await db
      .getRepository(Role)
      .findOneByOrFail({ id: viewRole.id });
    assert.equal(role.version, roleVersion);
    assert.ok(
      (await db
        .getRepository(RolePermission)
        .countBy({ roleId: viewRole.id })) > 0,
    );
  });
  await check('并发禁用最后两名超级管理员只能成功一次', async () => {
    const results = await Promise.all(
      [root, root2].map((actor) =>
        call(`/system/users/${actor.id}/update`, {
          token: actor.token,
          body: { version: 1, enabled: false },
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    const survivor = results[0]!.status === 409 ? root : root2;
    const attempt = await call(`/system/users/${survivor.id}/assign-role`, {
      token: survivor.token,
      body: { version: 1, roleIds: [] },
    });
    assert.equal(attempt.body.businessCode, 'LAST_SUPER_ADMIN');
    const protectedRole = await call(`/system/roles/${superRole.id}/update`, {
      token: survivor.token,
      body: { version: superRole.version, enabled: false },
    });
    assert.equal(protectedRole.body.businessCode, 'LAST_SUPER_ADMIN');
  });
  await check('滑块公开接口独立来源限流与重试提示', async () => {
    let limited = false;
    for (let i = 0; i < 121; i++) {
      const response = await fetch(base + '/auth/captcha/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: process.env.APP_ORIGIN!,
        },
        body: '{}',
      });
      if (response.status === 429) {
        assert.equal(response.headers.get('retry-after'), '60');
        assert.equal((await response.json()).businessCode, 'RATE_LIMITED');
        limited = true;
        break;
      }
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }
    assert.equal(limited, true);
  });
}
