import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createDataSource, User, UserPermission } =
  require('../../dist/packages/database/src') as typeof import('../../packages/database/src');
if (
  process.env.DB_DATABASE !== 'dev_platform_test' ||
  process.env.DB_USERNAME !== 'devplatform_test'
)
  throw new Error('E2E 拒绝访问非专用数据库');
const db = createDataSource();
const username = `e2e_${randomUUID().slice(0, 8)}`;
const password = randomUUID().slice(0, 12);
let userId = '';
test.beforeAll(async () => {
  await db.initialize();
  const user = await db.getRepository(User).save({
    username,
    passwordHash: await hash(password, 12),
    realName: '工程验证用户',
    enabled: true,
    mustChangePassword: false,
    securityVersion: 1,
  });
  userId = user.id;
  for (const action of ['list', 'read', 'create', 'update', 'delete'])
    await db
      .getRepository(UserPermission)
      .save({ userId, code: `demo:record:${action}`, scope: 'SELF' });
});
test.afterAll(async () => {
  if (userId) {
    for (const table of [
      'sys_idempotency',
      'sys_audit',
      'sys_session',
      'sys_user_permission',
    ])
      await db.query(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    await db.query('DELETE FROM demo_record WHERE created_by = ?', [userId]);
    await db.getRepository(User).delete({ id: userId });
  }
  if (db.isInitialized) await db.destroy();
});
test('真实登录、台账读写、刷新恢复与删除', async ({ page }) => {
  const failedResources: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 500)
      failedResources.push(new URL(response.url()).pathname);
    if (response.status() >= 400 && !response.url().endsWith('/auth/refresh'))
      console.log(
        `HTTP ${response.status()} ${new URL(response.url()).pathname}`,
      );
  });
  await page.goto('/');
  await page.getByPlaceholder('请输入账号').fill(username);
  await page.getByPlaceholder('请输入密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '新增设备' }).click();
  await page.getByRole('button', { name: '保存设备' }).click();
  await expect(
    page.getByText('请输入 2–64 位大写字母、数字、- 或 _', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByPlaceholder('例如 DEV-0001，创建后不可修改'),
  ).toBeFocused();
  const code = `E2E-${randomUUID().slice(0, 8).toUpperCase()}`;
  await page.getByPlaceholder('例如 DEV-0001，创建后不可修改').fill(code);
  await page.getByPlaceholder('请输入设备名称').fill('工程验收设备');
  await page.getByRole('button', { name: '保存设备' }).click();
  await expect(
    page.getByRole('cell', { name: code, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('cell', { name: code, exact: true }),
  ).toBeVisible();
  const persisted = await page.evaluate(() =>
    Object.values(localStorage).join(''),
  );
  expect(persisted).not.toMatch(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  );
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByPlaceholder('请输入设备名称').fill('已更新的工程验收设备');
  await page.getByRole('button', { name: '保存设备' }).click();
  await expect(
    page.getByRole('cell', { name: '已更新的工程验收设备', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(failedResources).toEqual([]);
  await expect(page.getByText('台账已保存', { exact: true })).toBeHidden();
  await page.screenshot({ path: 'test-results/framework.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'light', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'dark', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/records-light.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'dark', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'light', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 900, height: 800 });
  await page.screenshot({
    path: 'test-results/records-narrow.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page
    .getByRole('textbox', { name: '设备名称', exact: true })
    .fill('不存在的设备');
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(
    page.getByText('暂无设备记录，可新增设备或调整筛选'),
  ).toBeVisible();
  await page.getByRole('button', { name: '重置', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: code, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByPlaceholder('请输入设备名称').fill('未保存的设备名称');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page.getByPlaceholder('请输入设备名称')).toHaveValue(
    '未保存的设备名称',
  );
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await page.screenshot({
    path: 'test-results/record-editor.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('cell', { name: code, exact: true })).toHaveCount(
    0,
  );
});

test('6 位新密码修改、确认校验和重新登录', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByPlaceholder('请输入账号').fill(username);
  await page.getByPlaceholder('请输入密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
  await page.goto('/#/auth/change-password');
  await page.getByLabel('当前密码', { exact: true }).fill(password);
  await page.getByLabel('新密码', { exact: true }).fill('12345');
  await page.getByRole('button', { name: '保存并重新登录' }).click();
  await expect(
    page.getByText('新密码须为 6–12 位', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('新密码', { exact: true }).fill('Abc123');
  await page.getByLabel('确认新密码', { exact: true }).fill('Abc124');
  await page.getByRole('button', { name: '保存并重新登录' }).click();
  await expect(
    page.getByText('两次输入的密码不一致', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('确认新密码', { exact: true }).fill('Abc123');
  await page.screenshot({
    path: 'test-results/change-password.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '保存并重新登录' }).click();
  await expect(page.getByPlaceholder('请输入账号')).toBeVisible();
  await page.getByPlaceholder('请输入账号').fill(username);
  await page.getByPlaceholder('请输入密码', { exact: true }).fill('Abc123');
  await page.getByRole('button', { name: 'login', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '设备台账', exact: true }),
  ).toBeVisible();
});
