import { completeLoginSlider, loginThroughApi } from './login-helper';
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
const require = createRequire(import.meta.url);
const { createDataSource, User, UserRole, Role } =
  require('../../dist/packages/database/src') as typeof import('../../packages/database/src');
if (
  process.env.APP_ENV !== 'test' ||
  process.env.INSTANCE_ID !== 'dev-platform-test' ||
  process.env.DB_DATABASE !== 'dev_platform_test' ||
  process.env.DB_USERNAME !== 'devplatform_test' ||
  !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST ?? '')
)
  throw new Error('仅允许独立本机测试库');
const db = createDataSource();
test.setTimeout(90000);
test.use({ actionTimeout: 10000 });
const run = randomUUID().slice(0, 8),
  rootName = `ui_root_${run}`,
  username = `ui_member_${run}`,
  roleCode = `ui-role-${run}`,
  menuCode = `ui-menu-${run}`;
const password = randomUUID().slice(0, 12),
  temporary = 'Test123!',
  newPassword = 'Next123!';
let rootId = '';
test.beforeAll(async () => {
  await db.initialize();
  await db.getRepository(User).insert({
    username: rootName,
    realName: '授权验收管理员',
    passwordHash: await hash(password, 12),
    enabled: true,
    mustChangePassword: false,
    securityVersion: 1,
    version: 1,
  });
  rootId = (
    await db.getRepository(User).findOneByOrFail({ username: rootName })
  ).id;
  const role = await db
    .getRepository(Role)
    .findOneByOrFail({ code: 'super-admin' });
  await db.getRepository(UserRole).insert({ userId: rootId, roleId: role.id });
});
test.afterAll(async () => {
  if (!db.isInitialized) return;
  // 只清理本次随机命名用户、角色和目录；保留基础授权与其他测试记录。
  const rows: { id: string }[] = await db.query(
    'SELECT id FROM sys_user WHERE username IN (?,?)',
    [rootName, username],
  );
  for (const row of rows) {
    for (const table of [
      'sys_user_role',
      'sys_session',
      'sys_user_permission',
      'sys_idempotency',
      'sys_audit',
    ])
      await db.query(`DELETE FROM ${table} WHERE user_id=?`, [row.id]);
    await db.getRepository(User).delete({ id: row.id });
  }
  const roles: { id: string }[] = await db.query(
    'SELECT id FROM sys_role WHERE code=?',
    [roleCode],
  );
  for (const row of roles) {
    await db.query('DELETE FROM sys_role_permission WHERE role_id=?', [row.id]);
    await db.query('DELETE FROM sys_role_menu WHERE role_id=?', [row.id]);
    await db.getRepository(Role).delete({ id: row.id });
  }
  await db.query('DELETE FROM sys_menu WHERE code=?', [menuCode]);
  await db.destroy();
});
async function capture(page: import('@playwright/test').Page, path: string) {
  await expect(page.locator('.el-loading-mask:visible')).toHaveCount(0);
  await expect(page.locator('.el-message')).toHaveCount(0, { timeout: 10000 });
  await expect(page.locator('.el-notification')).toHaveCount(0, {
    timeout: 10000,
  });
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
}
test('管理员配置角色、账号与菜单，普通账号页面和直连 API 均受限', async ({
  page,
  browser,
  request,
}) => {
  await page.goto('/');
  await page.getByPlaceholder('请输入账号').fill(rootName);
  await page.getByPlaceholder('请输入密码', { exact: true }).fill(password);
  await completeLoginSlider(page);
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
  await page.goto('/#/system/roles');
  await expect(
    page.getByRole('heading', { name: '角色管理', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '新增角色', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('角色编码', { exact: true }).fill(roleCode);
  await dialog.getByLabel('角色名称', { exact: true }).fill('仅查看设备');
  await dialog.getByRole('button', { name: '保存角色', exact: true }).click();
  const roleRow = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: roleCode, exact: true }) });
  await expect(roleRow).toBeVisible();
  await roleRow.getByRole('button', { name: '授权', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('导航分配', { exact: true }).focus();
  await dialog.getByLabel('导航分配', { exact: true }).press('ArrowDown');
  await page.getByRole('option', { name: '设备台账', exact: true }).click();
  await dialog.getByRole('heading', { name: /操作权限与范围/ }).click();
  const listCheckbox = dialog.getByRole('checkbox', {
    name: '授予 demo:record:list',
    exact: true,
  });
  await listCheckbox.locator('..').click();
  await expect(listCheckbox).toBeChecked();
  await dialog.getByRole('button', { name: '保存授权', exact: true }).click();
  await expect(dialog).toBeHidden();
  await capture(page, 'test-results/authorization-roles.png');
  await page.goto('/#/system/users');
  await page.getByRole('button', { name: '新增用户', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('账号', { exact: true }).fill(username);
  await dialog.getByLabel('姓名', { exact: true }).fill('授权验收业务员');
  await dialog.getByLabel('临时密码', { exact: true }).fill(temporary);
  await dialog.getByRole('button', { name: '保存用户', exact: true }).click();
  const userRow = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: username, exact: true }) });
  await expect(userRow).toBeVisible();
  await userRow.getByRole('button', { name: '分配角色', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('分配角色', { exact: true })).toBeEnabled();
  await dialog.getByLabel('分配角色', { exact: true }).focus();
  await dialog.getByLabel('分配角色', { exact: true }).press('ArrowDown');
  await page.getByRole('option', { name: '仅查看设备', exact: true }).click();
  await dialog.getByText('分配角色', { exact: true }).click();
  await dialog.getByRole('button', { name: '保存用户', exact: true }).click();
  await expect(dialog).toBeHidden();
  await capture(page, 'test-results/authorization-users.png');
  await page.getByRole('button', { name: 'light', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'dark', exact: true }),
  ).toBeVisible();
  await capture(page, 'test-results/authorization-users-light.png');
  await page.getByRole('button', { name: 'dark', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'light', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 900, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, 'test-results/authorization-users-narrow.png');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#/system/menus');
  await page.getByRole('button', { name: '新增菜单', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('菜单编码', { exact: true }).fill(menuCode);
  await dialog.getByLabel('标题', { exact: true }).fill('验收目录');
  await dialog.getByLabel('菜单类型', { exact: true }).focus();
  await dialog.getByLabel('菜单类型', { exact: true }).press('ArrowDown');
  await page.getByRole('option', { name: '目录', exact: true }).click();
  await dialog.getByLabel('路由名', { exact: true }).fill(`UiMenu${run}`);
  await dialog.getByLabel('路径', { exact: true }).fill(`/ui-menu-${run}`);
  await dialog.getByRole('button', { name: '保存菜单', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: '验收目录', exact: true }),
  ).toBeVisible();
  await capture(page, 'test-results/authorization-menus.png');
  const context = await browser.newContext({ baseURL: process.env.APP_ORIGIN });
  const member = await context.newPage();
  try {
    await member.goto('/');
    await member.getByPlaceholder('请输入账号').fill(username);
    await member
      .getByPlaceholder('请输入密码', { exact: true })
      .fill(temporary);
    await completeLoginSlider(member);
    await member.getByRole('button', { name: 'login', exact: true }).click();
    await member.getByLabel('当前密码', { exact: true }).fill(temporary);
    await member.getByLabel('新密码', { exact: true }).fill(newPassword);
    await member.getByLabel('确认新密码', { exact: true }).fill(newPassword);
    await member.getByRole('button', { name: '保存并重新登录' }).click();
    await expect(member.getByPlaceholder('请输入账号')).toBeVisible();
    await member.getByPlaceholder('请输入账号').fill(username);
    await member
      .getByPlaceholder('请输入密码', { exact: true })
      .fill(newPassword);
    await completeLoginSlider(member);
    await member.getByRole('button', { name: 'login', exact: true }).click();
    await expect(
      member.getByRole('heading', { name: '设备台账', exact: true }),
    ).toBeVisible();
    await expect(
      member.getByRole('button', { name: '新增设备', exact: true }),
    ).toHaveCount(0);
    await expect(
      member.getByRole('link', { name: '用户管理', exact: true }),
    ).toHaveCount(0);
    await capture(member, 'test-results/authorization-member.png');
    const login = await loginThroughApi(request, username, newPassword);
    expect(login.status()).toBe(200);
    const token = (await login.json()).data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    expect(
      (await request.get('/api/v1/system/users', { headers })).status(),
    ).toBe(403);
    expect(
      (
        await request.post('/api/v1/demo/records', {
          headers,
          data: { code: 'BYPASS', name: '绕过页面' },
        })
      ).status(),
    ).toBe(403);
    await member.goto('/#/system/users');
    await expect(
      member.getByRole('heading', { name: '用户管理', exact: true }),
    ).toHaveCount(0);
    await member.goto('/#/account/sessions');
    await expect(
      member.getByRole('heading', { name: '我的会话', exact: true }),
    ).toBeVisible();
    await expect(member.getByRole('cell', { name: /^当前会话/ })).toBeVisible();
    const otherSession = member
      .getByRole('row')
      .filter({ has: member.getByRole('cell', { name: /^其他会话/ }) })
      .filter({
        has: member.getByRole('button', { name: '撤销', exact: true }),
      })
      .first();
    await otherSession
      .getByRole('button', { name: '撤销', exact: true })
      .click();
    await member.getByRole('button', { name: '确认撤销', exact: true }).click();
    await expect(member.getByText('会话已撤销', { exact: true })).toBeVisible();
    expect((await request.get('/api/v1/auth/me', { headers })).status()).toBe(
      401,
    );
    await capture(member, 'test-results/authorization-sessions.png');
  } finally {
    await context.close();
  }
});
