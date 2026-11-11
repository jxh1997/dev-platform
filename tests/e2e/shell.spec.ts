import { completeLoginSlider } from './login-helper';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  createDataSource,
  User,
  UserRole,
  Role,
  RolePermission,
  RoleMenu,
  Menu,
} =
  require('../../dist/packages/database/src') as typeof import('../../packages/database/src');
if (
  process.env.DB_DATABASE !== 'dev_platform_test' ||
  process.env.DB_USERNAME !== 'devplatform_test'
)
  throw new Error('E2E 拒绝访问非专用数据库');
const db = createDataSource();
const username = `shell_${randomUUID().slice(0, 8)}`;
const password = randomUUID().slice(0, 12);
let userId = '';
let roleId = '';
test.beforeAll(async () => {
  await db.initialize();
  const user = await db.getRepository(User).save({
    username,
    passwordHash: await hash(password, 12),
    realName: '交互验收用户',
    enabled: true,
    mustChangePassword: false,
    securityVersion: 1,
  });
  userId = user.id;
  await db.getRepository(Role).insert({
    code: username,
    name: '交互验收角色',
    enabled: true,
    isSuperAdmin: false,
    version: 1,
  });
  const role = await db.getRepository(Role).findOneByOrFail({ code: username });
  roleId = role.id;
  await db.getRepository(UserRole).insert({ userId, roleId });
  for (const action of ['list', 'read', 'create', 'update', 'delete'])
    await db
      .getRepository(RolePermission)
      .insert({ roleId, code: `demo:record:${action}`, scope: 'SELF' });
  const menu = await db
    .getRepository(Menu)
    .findOneByOrFail({ code: 'records' });
  await db.getRepository(RoleMenu).insert({ roleId, menuId: menu.id });
});
test.afterAll(async () => {
  if (userId) {
    for (const table of [
      'sys_idempotency',
      'sys_audit',
      'sys_session',
      'sys_user_permission',
      'sys_user_role',
    ])
      await db.query(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    await db.query('DELETE FROM demo_record WHERE created_by = ?', [userId]);
    await db.getRepository(User).delete({ id: userId });
    await db.getRepository(RolePermission).delete({ roleId });
    await db.getRepository(RoleMenu).delete({ roleId });
    await db.getRepository(Role).delete({ id: roleId });
  }
  if (db.isInitialized) await db.destroy();
});
async function login(page: import('@playwright/test').Page) {
  await page.goto('/#/auth/login');
  await page.getByPlaceholder('请输入账号').fill(username);
  await page.getByPlaceholder('请输入密码', { exact: true }).fill(password);
  await completeLoginSlider(page);
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.locator('.el-notification')).toHaveCount(0, {
    timeout: 10000,
  });
}

async function closeDialog(page: import('@playwright/test').Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
}

test('登录布局、记住账号与主题在刷新后保留', async ({ page }) => {
  await page.goto('/#/auth/login');
  for (const [name, layout] of [
    ['居左', 'panel-left'],
    ['居中', 'panel-center'],
    ['居右', 'panel-right'],
  ]) {
    await page.getByRole('button', { name: '登录布局', exact: true }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
    await expect(page.locator('.auth-shell')).toHaveClass(
      new RegExp(`auth-layout-${layout}`),
    );
    // Preferences use a short debounced write.
    await expect
      .poll(() => page.evaluate(() => Object.values(localStorage).join('')))
      .toContain(layout);
    await page.reload();
    await expect(page.locator('.auth-shell')).toHaveClass(
      new RegExp(`auth-layout-${layout}`),
    );
  }
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '偏好设置' })).toBeVisible();
  await page.getByRole('button', { name: '浅色', exact: true }).click();
  await closeDialog(page);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.screenshot({
    path: 'test-results/shell-login.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByPlaceholder('请输入账号')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/shell-login-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('checkbox').check();
  await page.getByPlaceholder('请输入账号').fill(username);
  await page.getByPlaceholder('请输入密码', { exact: true }).fill(password);
  await completeLoginSlider(page);
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
  await page.context().clearCookies();
  await page.reload();
  await expect(page.getByPlaceholder('请输入账号')).toHaveValue(username);
  await expect(
    page.getByPlaceholder('请输入密码', { exact: true }),
  ).toHaveValue('');
  const persisted = await page.evaluate(() =>
    Object.values(localStorage).join(''),
  );
  expect(persisted).not.toContain(password);
  expect(persisted).not.toMatch(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  );
  await page.getByRole('checkbox').uncheck();
  await page.getByPlaceholder('请输入密码', { exact: true }).fill(password);
  await completeLoginSlider(page);
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
  await page.context().clearCookies();
  await page.reload();
  await expect(page.getByPlaceholder('请输入账号')).toHaveValue('');
});

test('后台偏好、全屏、通知、个人中心、搜索标签及锁屏', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.getByRole('button', { name: '全屏', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.getByRole('button', { name: '退出全屏', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await page.getByRole('button', { name: '通知', exact: true }).click();
  await page.getByRole('button', { name: '查看所有消息', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '消息中心' })).toBeVisible();
  await expect(page.getByText('暂无站内消息', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/shell-notifications.png',
    fullPage: false,
    animations: 'disabled',
  });
  await closeDialog(page);
  await page.getByRole('button', { name: '设置时区', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '设置时区' })).toBeVisible();
  await closeDialog(page);
  await page
    .getByRole('button', { name: '交互验收用户：用户菜单', exact: true })
    .click();
  await page.getByRole('menuitem', { name: '个人中心', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '个人中心' })).toContainText(
    username,
  );
  await page.getByRole('button', { name: '我的会话', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '我的会话', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '内容最大化', exact: true }).click();
  await page.getByRole('button', { name: '还原内容', exact: true }).click();
  await page.getByRole('button', { name: '刷新当前标签', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '我的会话', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await page.getByPlaceholder('搜索导航菜单').fill('设备台账');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  const prefs = page.getByRole('dialog', { name: '偏好设置' });
  await prefs.getByRole('tab', { name: '外观', exact: true }).click();
  await prefs.getByRole('button', { name: '浅色', exact: true }).click();
  await prefs.getByRole('tab', { name: '布局', exact: true }).click();
  await prefs.getByRole('button', { name: '水平', exact: true }).click();
  await page.screenshot({
    path: 'test-results/shell-preferences.png',
    fullPage: false,
    animations: 'disabled',
  });
  await closeDialog(page);
  await expect
    .poll(() => page.evaluate(() => Object.values(localStorage).join('')))
    .toContain('header-nav');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await prefs.getByRole('tab', { name: '布局', exact: true }).click();
  await expect(
    prefs.getByRole('button', { name: '水平', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await prefs
    .getByRole('button', { name: '重置偏好设置', exact: true })
    .click();
  await closeDialog(page);
  await page
    .getByRole('button', { name: '交互验收用户：用户菜单', exact: true })
    .click();
  await page.getByRole('menuitem', { name: /锁定屏幕/ }).click();
  await page.getByPlaceholder('请输入锁屏密码').fill('ScreenPin');
  await page.getByRole('button', { name: '锁定屏幕', exact: true }).click();
  await page.getByRole('button', { name: '点击解锁', exact: true }).click();
  await page.getByPlaceholder('请输入锁屏密码').fill('wrong');
  await page.getByRole('button', { name: '进入系统', exact: true }).click();
  await expect(page.getByText('密码错误', { exact: true })).toBeVisible();
  await page.getByPlaceholder('请输入锁屏密码').fill('ScreenPin');
  await page.screenshot({
    path: 'test-results/shell-lock.png',
    fullPage: false,
    animations: 'disabled',
  });
  expect(
    await page.evaluate(() => Object.values(localStorage).join('')),
  ).not.toContain('ScreenPin');
  await page.getByRole('button', { name: '进入系统', exact: true }).click();
  await expect(page.getByPlaceholder('请输入锁屏密码')).toBeHidden();
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await prefs.getByRole('tab', { name: '外观', exact: true }).click();
  await prefs.getByRole('button', { name: '浅色', exact: true }).click();
  await prefs
    .getByRole('button', { name: '清空缓存 & 退出登录', exact: true })
    .click();
  await expect(page.getByPlaceholder('请输入账号')).toBeVisible();
  expect(errors).toEqual([]);
});

test('工具栏开关持久化、快捷锁屏与返回登录', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  const prefs = page.getByRole('dialog', { name: '偏好设置' });
  await prefs.getByRole('tab', { name: '布局', exact: true }).click();
  await prefs.getByRole('switch', { name: '启用通知', exact: true }).uncheck();
  await closeDialog(page);
  await expect(
    page.getByRole('button', { name: '通知', exact: true }),
  ).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => Object.values(localStorage).join('')))
    .toContain('"notification":false');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '通知', exact: true }),
  ).toBeHidden();
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await prefs.getByRole('tab', { name: '布局', exact: true }).click();
  await prefs.getByRole('switch', { name: '启用通知', exact: true }).check();
  await closeDialog(page);
  await expect(
    page.getByRole('button', { name: '通知', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Alt+KeyL');
  await page.getByPlaceholder('请输入锁屏密码').fill('TempPin');
  await page.getByRole('button', { name: '锁定屏幕', exact: true }).click();
  await page.getByRole('button', { name: '点击解锁', exact: true }).click();
  await page.getByRole('button', { name: '返回登录', exact: true }).click();
  await expect(page.getByPlaceholder('请输入账号')).toBeVisible();
  await page.reload();
  await expect(page.getByPlaceholder('请输入账号')).toBeVisible();
});

test('登录滑块拒绝跳过、鼠标拖动、密码失败重置和刷新失效', async ({ page }) => {
  await page.goto('/#/auth/login');
  await page.getByPlaceholder('请输入账号').fill(username);
  await page
    .getByPlaceholder('请输入密码', { exact: true })
    .fill('wrong-password');
  let loginRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/auth/login')) loginRequests++;
  });
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await expect(
    page.getByText('请先完成滑块验证', { exact: true }),
  ).toBeVisible();
  expect(loginRequests).toBe(0);
  const slider = page.getByRole('slider', { name: '请按住滑块拖动到最右侧' });
  const bounds = await slider.boundingBox();
  if (!bounds) throw new Error('滑块未渲染');
  await page.mouse.move(bounds.x + 20, bounds.y + bounds.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(
      bounds.x + 20 + ((bounds.width - 25) * i) / 16,
      bounds.y + bounds.height / 2,
    );
    // 模拟持续拖动，而不是在同一时刻伪造完成事件。
    await page.waitForTimeout(35);
  }
  await page.mouse.up();
  await expect(page.getByText('验证通过', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await expect(page.getByText('账号或密码错误', { exact: true })).toBeVisible();
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('验证通过', { exact: true })).toBeHidden();
  await completeLoginSlider(page);
  const persisted = await page.evaluate(() =>
    Object.values(localStorage).join(''),
  );
  expect(persisted).not.toContain('captchaToken');
  await page.reload();
  await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('验证通过', { exact: true })).toBeHidden();
  await page.screenshot({
    path: 'test-results/login-slider-dark.png',
    animations: 'disabled',
  });
});
