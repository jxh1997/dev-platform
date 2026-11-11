import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { LoginCaptchaService } =
  require('../dist/packages/backend-modules/src/auth/login-captcha.service') as typeof import('../packages/backend-modules/src/auth/login-captcha.service');
const service = new LoginCaptchaService();
const realNow = Date.now;
let now = 1_000_000;
Date.now = () => now;
try {
  let c = service.challenge(undefined);
  assert.throws(() => service.verify(c.challengeId, 100, c.browser));
  now += 500;
  assert.throws(() => service.verify(c.challengeId, 100, c.browser));
  c = service.challenge(undefined);
  now += 500;
  assert.throws(() => service.verify(c.challengeId, 99, c.browser));
  assert.throws(() => service.verify(c.challengeId, 100, c.browser));
  c = service.challenge(undefined);
  now += 500;
  assert.throws(() => service.verify(c.challengeId, 100, 'another-browser'));
  const ticket = service.verify(c.challengeId, 100, c.browser);
  assert.throws(() => service.verify(c.challengeId, 100, c.browser));
  assert.throws(() => service.consume(ticket.captchaToken, 'another-browser'));
  assert.throws(() => service.consume('forged', c.browser));
  service.consume(ticket.captchaToken, c.browser);
  assert.throws(() => service.consume(ticket.captchaToken, c.browser));
  c = service.challenge(undefined);
  now += 120_000;
  assert.throws(() => service.verify(c.challengeId, 100, c.browser));
  c = service.challenge(undefined);
  now += 500;
  const expired = service.verify(c.challengeId, 100, c.browser);
  now += 60_000;
  assert.throws(() => service.consume(expired.captchaToken, c.browser));
  c = service.challenge(undefined);
  now += 500;
  const shared = service.verify(c.challengeId, 100, c.browser);
  const results = await Promise.allSettled(
    [0, 1].map(async () => service.consume(shared.captchaToken, c.browser)),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const bounded = new LoginCaptchaService();
  for (let i = 0; i < 2000; i++) bounded.challenge(undefined);
  assert.throws(() => bounded.challenge(undefined));
  now += 120_001;
  bounded.challenge(undefined);
  console.log(
    'PASS 滑块最短等待、未完成、跨浏览器、伪造、重放、过期、并发仅一次及容量清理',
  );
} finally {
  Date.now = realNow;
}
