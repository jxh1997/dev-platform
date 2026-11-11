import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { fail } from '../common/http';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
interface Challenge {
  binding: string;
  issuedAt: number;
  expiresAt: number;
}
interface Ticket {
  binding: string;
  expiresAt: number;
}

/** 单进程的交互校验门槛，不宣称能识别真人；不接受客户端的 verified 标记。 */
@Injectable()
export class LoginCaptchaService {
  private readonly challenges = new Map<string, Challenge>();
  private readonly tickets = new Map<string, Ticket>();

  private cleanup(now: number) {
    for (const entries of [this.challenges, this.tickets])
      for (const [id, value] of entries)
        if (value.expiresAt <= now) entries.delete(id);
  }

  challenge(cookie: string | undefined) {
    const now = Date.now();
    this.cleanup(now);
    if (this.challenges.size + this.tickets.size >= 2000)
      fail(429, 'AUTH_CAPTCHA_BUSY', '验证请求较多，请稍后重试');
    const browser =
      cookie && /^[A-Za-z0-9_-]{43}$/.test(cookie) ? cookie : secret();
    const challengeId = randomUUID();
    const expiresAt = now + 120_000;
    this.challenges.set(challengeId, {
      binding: digest(browser),
      issuedAt: now,
      expiresAt,
    });
    return {
      browser,
      challengeId,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  verify(challengeId: string, progress: number, cookie: string | undefined) {
    const now = Date.now();
    this.cleanup(now);
    const challenge = this.challenges.get(challengeId);
    // 只有拥有绑定 Cookie 的请求能消费挑战，防止猜 ID 干扰其他浏览器。
    if (!challenge || !cookie || challenge.binding !== digest(cookie))
      fail(403, 'AUTH_CAPTCHA_INVALID', '验证已失效，请重新拖动滑块');
    this.challenges.delete(challengeId);
    if (progress !== 100 || now - challenge.issuedAt < 400)
      fail(403, 'AUTH_CAPTCHA_INVALID', '请完整拖动滑块后重试');
    const captchaToken = secret();
    const expiresAt = now + 60_000;
    this.tickets.set(digest(captchaToken), {
      binding: challenge.binding,
      expiresAt,
    });
    return { captchaToken, expiresAt: new Date(expiresAt).toISOString() };
  }

  consume(captchaToken: string, cookie: string | undefined) {
    const now = Date.now();
    this.cleanup(now);
    const key = digest(captchaToken);
    const ticket = this.tickets.get(key);
    if (!ticket || !cookie || ticket.binding !== digest(cookie))
      fail(403, 'AUTH_CAPTCHA_INVALID', '请先完成滑块验证，验证通过后再登录');
    // 在任何异步密码校验前删除，错误密码和并发登录不能重复使用凭证。
    this.tickets.delete(key);
  }
}
