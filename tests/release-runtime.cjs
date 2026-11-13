const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test', override: true, quiet: true });
if (
  process.env.APP_ENV !== 'test' ||
  process.env.INSTANCE_ID !== 'dev-platform-test'
) {
  throw new Error(
    'Release verification requires the known isolated test configuration',
  );
}
const compose = [
  'compose',
  '-p',
  'dev-platform-release-validation',
  '--env-file',
  '.env.test',
  '-f',
  'deployment/compose.release-test.yaml',
];
function command(args, env = {}) {
  return spawnSync('docker', [...compose, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 30000,
  });
}
function run(args, label, env) {
  const result = command(args, env);
  assert.equal(
    result.status,
    0,
    label + ' failed; diagnostics are intentionally not printed',
  );
  return result.stdout;
}
const origin = 'http://127.0.0.1:5779';
const base = origin + '/api/v1';
const initial = 'Fixture123!';
const updated = 'Changed123!';
const adminName = 'release_fixture_admin';
const memberName = 'release_m_' + randomUUID().slice(0, 8);
const results = [];
function pass(label) {
  results.push(label);
  console.log('PASS ' + label);
}
function client() {
  const cookies = new Map();
  let token;
  return {
    setToken(value) {
      token = value;
    },
    async call(path, body, extra = {}) {
      const response = await fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(cookies.size
            ? { Cookie: [...cookies].map(([k, v]) => k + '=' + v).join('; ') }
            : {}),
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0];
        const pos = pair.indexOf('=');
        cookies.set(pair.slice(0, pos), pair.slice(pos + 1));
      }
      return { status: response.status, body: await response.json() };
    },
    async login(username, password) {
      const challenge = await this.call('/auth/captcha/challenge', {});
      assert.equal(challenge.status, 200, 'captcha challenge');
      await new Promise((resolve) => setTimeout(resolve, 450));
      const verified = await this.call('/auth/captcha/verify', {
        challengeId: challenge.body.data.challengeId,
        progress: 100,
      });
      assert.equal(verified.status, 200, 'captcha verify');
      const login = await this.call('/auth/login', {
        username,
        password,
        captchaToken: verified.body.data.captchaToken,
      });
      if (login.status === 200) token = login.body.data.accessToken;
      return login.status;
    },
  };
}

async function main() {
  run(
    [
      'exec',
      '-T',
      'server',
      'node',
      '-e',
      "if(process.env.APP_ENV!=='test'||process.env.INSTANCE_ID!=='dev-platform-release-test')process.exit(1)",
    ],
    'isolated runtime guard',
  );
  const inventory = JSON.parse(
    run(
      [
        'exec',
        '-T',
        'server',
        'node',
        '-e',
        "const fs=require('fs'),a=require('assert/strict'),crypto=require('crypto');a.ok(process.getuid()>0);a.ok(!fs.existsSync('/app/apps'));a.ok(!fs.existsSync('/app/packages'));a.ok(!fs.existsSync('/app/.env'));a.ok(!fs.existsSync('/usr/local/lib/node_modules/npm'));const status=fs.readFileSync('/proc/self/status','utf8');a.ok(/NoNewPrivs:\\s+1/.test(status));a.ok(/CapEff:\\s+0+/.test(status));const p=JSON.parse(fs.readFileSync('/app/third-party/packages.json'));for(const item of p.packages){a.equal(typeof item.license,'string');a.ok(!['vite','typescript','tsx','eslint','knip','deepmerge'].includes(item.name));for(const f of item.licenseFiles)a.equal(crypto.createHash('sha256').update(fs.readFileSync('/app/'+f.file)).digest('hex'),f.sha256)}process.stdout.write(JSON.stringify(p));",
      ],
      'runtime isolation and license checks',
    ),
  );
  mkdirSync('.release/verification', { recursive: true });
  writeFileSync(
    '.release/verification/server-packages.json',
    JSON.stringify(inventory, null, 2),
  );
  pass(
    'non-root readonly runtime, zero capabilities, no workspace/build tools, original license integrity',
  );
  run(
    [
      'exec',
      '-T',
      'server',
      'node',
      'dist/packages/database/src/cli.js',
      'show',
      '--require-clean',
    ],
    'compiled migration CLI',
  );
  const init = command(
    [
      'exec',
      '-T',
      '-e',
      'INIT_ADMIN_USERNAME',
      '-e',
      'INIT_ADMIN_PASSWORD',
      'server',
      'node',
      'dist/packages/database/src/cli.js',
      'admin',
    ],
    {
      INIT_ADMIN_USERNAME: adminName,
      INIT_ADMIN_PASSWORD: initial,
    },
  );
  assert.ok(
    init.status === 0 || /管理员已初始化/.test(init.stderr + init.stdout),
    'isolated admin CLI initialization',
  );
  pass('compiled migration and administrator initialization CLI');
  const admin = client();
  let password = initial;
  if ((await admin.login(adminName, password)) !== 200) {
    password = updated;
    assert.equal(
      await admin.login(adminName, password),
      200,
      'known fixture login',
    );
  }
  let me = await admin.call('/auth/me');
  assert.equal(me.status, 200);
  if (me.body.data.mustChangePassword) {
    assert.equal(
      (
        await admin.call('/auth/password', {
          currentPassword: password,
          newPassword: updated,
        })
      ).status,
      200,
    );
    assert.equal(await admin.login(adminName, updated), 200);
  }
  assert.equal(
    (await admin.call('/system/users')).status,
    200,
    'admin permission',
  );
  pass('real captcha login, initial password change and administrator API');
  const menus = await admin.call('/system/menus?page=1&pageSize=100');
  assert.equal(menus.status, 200);
  const selected = menus.body.data.list
    .filter((m) => ['/demo', '/demo/records'].includes(m.path))
    .map((m) => m.id);
  assert.ok(selected.length > 0, 'published demo menu');
  const role = await admin.call(
    '/system/roles',
    {
      code: 'release_' + randomUUID().slice(0, 8),
      name: '发行验证只读',
    },
    { 'Idempotency-Key': randomUUID() },
  );
  assert.equal(role.status, 201);
  assert.equal(
    (
      await admin.call('/system/roles/' + role.body.data.id + '/grants', {
        version: role.body.data.version,
        permissions: [{ code: 'demo:record:list', scope: 'SELF' }],
        menuIds: selected,
      })
    ).status,
    200,
  );
  const created = await admin.call(
    '/system/users',
    { username: memberName, realName: '发行验证用户', password: initial },
    { 'Idempotency-Key': randomUUID() },
  );
  assert.equal(created.status, 201);
  assert.equal(
    (
      await admin.call(
        '/system/users/' + created.body.data.id + '/assign-role',
        {
          version: created.body.data.version,
          roleIds: [role.body.data.id],
        },
      )
    ).status,
    200,
  );
  const member = client();
  assert.equal(await member.login(memberName, initial), 200);
  assert.equal(
    (
      await member.call('/auth/password', {
        currentPassword: initial,
        newPassword: updated,
      })
    ).status,
    200,
  );
  assert.equal(await member.login(memberName, updated), 200);
  me = await member.call('/auth/me');
  assert.equal(me.body.data.mustChangePassword, false);
  assert.equal((await member.call('/demo/records')).status, 200);
  const denied = await member.call('/system/users');
  assert.equal(denied.status, 403);
  assert.equal(denied.body.businessCode, 'AUTHZ_DENIED');
  assert.equal(
    (
      await member.call(
        '/demo/records',
        { code: 'BYPASS', name: 'fixture' },
        { 'Idempotency-Key': randomUUID() },
      )
    ).status,
    403,
  );
  pass(
    'member read scope works; system API and forged write calls return permission denial',
  );
  const guest = client();
  assert.equal((await guest.call('/system/users')).status, 401);
  assert.equal((await member.call('/auth/refresh', {})).status, 200);
  assert.equal((await member.call('/auth/logout', {})).status, 200);
  assert.equal((await member.call('/auth/me')).status, 401);
  pass('unauthenticated access, refresh and session revocation');
  const licenses = await fetch(origin + '/third-party/packages.json');
  assert.equal(licenses.status, 200);
  const web = await licenses.json();
  assert.equal(web.artifact, 'web');
  assert.ok(
    web.packages.length > 0 &&
      web.packages.every((p) => p.license && p.licenseFiles.length),
  );
  for (const item of web.packages) {
    for (const source of item.licenseFiles) {
      const response = await fetch(origin + '/' + source.file);
      assert.equal(response.status, 200);
      const actual = createHash('sha256')
        .update(Buffer.from(await response.arrayBuffer()))
        .digest('hex');
      assert.equal(
        actual,
        source.sha256,
        'served license must be the original, not SPA fallback',
      );
    }
  }
  writeFileSync(
    '.release/verification/web-packages.json',
    JSON.stringify(web, null, 2),
  );
  pass(
    'Nginx serves actual bundled dependency inventory and every license original',
  );
  const browser = await chromium.launch({
    ...(process.env.E2E_BROWSER_CHANNEL
      ? { channel: process.env.E2E_BROWSER_CHANNEL }
      : {}),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.goto(origin + '/#/auth/login');
    await page.getByPlaceholder('请输入账号').fill(memberName);
    await page.getByPlaceholder('请输入密码', { exact: true }).fill(updated);
    await page.getByRole('slider', { name: '请按住滑块拖动到最右侧' }).focus();
    for (let i = 0; i < 5; i++)
      await page.keyboard.press('ArrowRight', { delay: 110 });
    await expect(page.getByText('验证通过', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'login', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: '设备台账', exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('button', { name: '新增设备', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: '用户管理', exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('.el-loading-mask:visible')).toHaveCount(0);
    await expect(page.locator('.el-message')).toHaveCount(0, {
      timeout: 10000,
    });
    await expect(page.locator('.el-notification')).toHaveCount(0, {
      timeout: 10000,
    });
    await page.screenshot({
      path: '.release/verification/member-static-image.png',
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
  pass(
    'real browser against built Nginx static image: slider login and permission-filtered page',
  );
  writeFileSync(
    '.release/verification/runtime-results.json',
    JSON.stringify(
      {
        date: '2026-11-12',
        project: 'dev-platform-release-validation',
        groups: results,
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error('Release verification failed:', error.message);
  process.exitCode = 1;
});
