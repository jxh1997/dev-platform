import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validateRuntime } =
  require('../dist/apps/server/src/application') as typeof import('../apps/server/src/application');
// 纯配置验证，不创建应用／连接数据库，不使用本机真实机器密钥。
Object.assign(process.env, {
  APP_ENV: 'development',
  INSTANCE_ID: 'origin-config-test',
  HOST: '127.0.0.1',
  PORT: '4310',
  JWT_SECRET: 'test-fixture-not-a-production-secret-0000',
});
for (const origin of [
  'http://127.0.0.1:5777',
  'http://localhost:5777',
  'https://platform.example.com',
]) {
  process.env.APP_ORIGIN = origin;
  assert.equal(validateRuntime().APP_ORIGIN, origin);
}
for (const origin of [
  'http://127.0.0.1:5777/',
  'http://127.0.0.1:5777/auth',
  'http://user:pass@127.0.0.1:5777',
  'file:///tmp/app',
  'invalid',
]) {
  process.env.APP_ORIGIN = origin;
  assert.throws(validateRuntime, /APP_ORIGIN/);
}
process.env.APP_ENV = 'production';
process.env.APP_ORIGIN = 'http://127.0.0.1:5777';
assert.throws(validateRuntime, /HTTPS/);
console.log(
  'PASS Origin 规范配置、路径／尾斜线／凭据拒绝及生产 HTTPS 限制；未连接数据库',
);
