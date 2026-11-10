import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { compare, hash } from 'bcryptjs';
import { sign, verify, TokenExpiredError, type JwtPayload } from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { User, UserPermission, Session, Audit } from '../../../database/src';
import { fail, type Principal } from '../common/http';

const tokenHash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(private readonly db: DataSource) {}

  private issue(session: Session) {
    return sign(
      { sub: session.userId, sid: session.id, sv: session.securityVersion },
      process.env.JWT_SECRET!,
      {
        algorithm: 'HS256',
        expiresIn: '15m',
        issuer: process.env.INSTANCE_ID!,
        audience: 'dev-platform-admin',
      },
    );
  }

  async login(username: string, password: string, requestId: string) {
    if (Buffer.byteLength(password, 'utf8') > 72)
      fail(401, 'AUTH_INVALID_CREDENTIALS', '账号或密码错误');
    const user = await this.db
      .getRepository(User)
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.username = :username', { username })
      .getOne();
    // 未知账号仍执行同成本校验，避免明显时间差；哈希不对应任何初始化账户。
    const dummy =
      '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5WyGj1MMQdRx84AxbteEdTBebhTZk96';
    const matches = await compare(password, user?.passwordHash ?? dummy);
    if (!user || !matches || !user.enabled)
      fail(401, 'AUTH_INVALID_CREDENTIALS', '账号或密码错误');
    const refresh = randomBytes(32).toString('base64url');
    const session = await this.db.transaction(async (em) => {
      const current = await em.findOneOrFail(User, {
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current.enabled || current.securityVersion !== user.securityVersion)
        fail(401, 'AUTH_INVALID_CREDENTIALS', '账号或密码错误');
      const session = em.create(Session, {
        id: randomUUID(),
        userId: user.id,
        refreshHash: tokenHash(refresh),
        generation: 1,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        revokedAt: null,
        securityVersion: user.securityVersion,
      });
      await em.save(session);
      await em.insert(Audit, {
        userId: user.id,
        action: 'auth:login',
        resourceId: session.id,
        requestId,
        details: {},
        createdAt: new Date(),
      });
      return session;
    });
    return {
      accessToken: this.issue(session),
      cookie: `${session.id}.${refresh}`,
    };
  }

  async authenticate(access: string): Promise<Principal> {
    let claims: JwtPayload | string;
    try {
      claims = verify(access, process.env.JWT_SECRET!, {
        algorithms: ['HS256'],
        issuer: process.env.INSTANCE_ID!,
        audience: 'dev-platform-admin',
      });
    } catch (error) {
      fail(
        401,
        error instanceof TokenExpiredError
          ? 'AUTH_ACCESS_EXPIRED'
          : 'AUTH_INVALID_TOKEN',
        '登录凭证失效',
      );
    }
    if (
      typeof claims === 'string' ||
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string' ||
      typeof claims.sv !== 'number'
    )
      fail(401, 'AUTH_INVALID_TOKEN', '登录凭证无效');
    const session = await this.db
      .getRepository(Session)
      .findOneBy({ id: claims.sid, userId: claims.sub, revokedAt: IsNull() });
    const user =
      session &&
      (await this.db
        .getRepository(User)
        .findOneBy({ id: session.userId, enabled: true }));
    if (
      !session ||
      !user ||
      session.expiresAt.getTime() <= Date.now() ||
      claims.sv !== user.securityVersion ||
      session.securityVersion !== user.securityVersion
    )
      fail(401, 'AUTH_SESSION_REVOKED', '会话已失效，请重新登录');
    const grants = await this.db
      .getRepository(UserPermission)
      .findBy({ userId: user.id });
    return {
      userId: user.id,
      sessionId: session.id,
      securityVersion: user.securityVersion,
      mustChangePassword: user.mustChangePassword,
      username: user.username,
      realName: user.realName,
      permissions: Object.fromEntries(grants.map((g) => [g.code, g.scope])),
    };
  }

  async refresh(cookie: string | undefined) {
    if (!cookie || !/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(cookie))
      fail(401, 'AUTH_SESSION_REVOKED', '请重新登录');
    const [sid, value] = cookie.split('.');
    // 复用撤销必须提交，不能随抛出的异常一起回滚。
    const result = await this.db.transaction(async (em) => {
      const session = await em.findOne(Session, {
        where: { id: sid },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt.getTime() <= Date.now()
      )
        return null;
      const user = await em.findOneBy(User, {
        id: session.userId,
        enabled: true,
      });
      if (
        !user ||
        user.securityVersion !== session.securityVersion ||
        tokenHash(value!) !== session.refreshHash
      ) {
        session.revokedAt = new Date();
        await em.save(session);
        return null;
      }
      const next = randomBytes(32).toString('base64url');
      session.refreshHash = tokenHash(next);
      session.generation += 1;
      await em.save(session);
      return {
        accessToken: this.issue(session),
        cookie: `${session.id}.${next}`,
      };
    });
    if (!result) fail(401, 'AUTH_SESSION_REVOKED', '会话失效，请重新登录');
    return result;
  }

  async logout(
    access: string | undefined,
    cookie: string | undefined,
    requestId: string,
  ) {
    let signedSession: { id: string; userId: string } | undefined;
    if (access?.startsWith('Bearer ')) {
      try {
        // 退出仅撤销签名标识的当前会话；允许过期 Access 做幂等撤销，不授予业务权限。
        const claims = verify(access.slice(7), process.env.JWT_SECRET!, {
          algorithms: ['HS256'],
          issuer: process.env.INSTANCE_ID!,
          audience: 'dev-platform-admin',
          ignoreExpiration: true,
        });
        if (
          typeof claims !== 'string' &&
          typeof claims.sid === 'string' &&
          typeof claims.sub === 'string'
        )
          signedSession = { id: claims.sid, userId: claims.sub };
      } catch {
        /* 无有效签名时仅尝试受 Origin 保护的刷新 Cookie。 */
      }
    }
    const parts =
      cookie && /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(cookie)
        ? cookie.split('.')
        : undefined;
    const sessionId = signedSession?.id ?? parts?.[0];
    if (sessionId)
      await this.db.transaction(async (em) => {
        const session = await em.findOne(Session, {
          where: { id: sessionId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!session || session.revokedAt) return;
        const allowed = signedSession
          ? signedSession.userId === session.userId
          : parts && tokenHash(parts[1]!) === session.refreshHash;
        if (!allowed) return;
        session.revokedAt = new Date();
        await em.save(session);
        await em.insert(Audit, {
          userId: session.userId,
          action: 'auth:logout',
          resourceId: session.id,
          requestId,
          details: {},
          createdAt: new Date(),
        });
      });
    return { success: true };
  }

  async changePassword(
    p: Principal,
    currentPassword: string,
    newPassword: string,
    requestId: string,
  ) {
    if (
      Buffer.byteLength(newPassword, 'utf8') > 72 ||
      Buffer.byteLength(currentPassword, 'utf8') > 72
    )
      fail(400, 'VALIDATION_FAILED', '密码 UTF-8 编码不得超过 72 字节');
    if (currentPassword === newPassword)
      fail(400, 'VALIDATION_FAILED', '新密码不能与当前密码相同');
    const passwordHash = await hash(newPassword, 12);
    await this.db.transaction(async (em) => {
      const user = await em
        .getRepository(User)
        .createQueryBuilder('u')
        .addSelect('u.passwordHash')
        .where('u.id = :id', { id: p.userId })
        .setLock('pessimistic_write')
        .getOneOrFail();
      if (
        user.securityVersion !== p.securityVersion ||
        !(await compare(currentPassword, user.passwordHash))
      )
        fail(400, 'AUTH_PASSWORD_MISMATCH', '当前密码错误或会话已变化');
      await em.update(
        User,
        { id: user.id },
        {
          passwordHash,
          mustChangePassword: false,
          securityVersion: user.securityVersion + 1,
        },
      );
      await em.update(
        Session,
        { userId: user.id, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      await em.insert(Audit, {
        userId: user.id,
        action: 'auth:password:change',
        resourceId: user.id,
        requestId,
        details: {},
        createdAt: new Date(),
      });
    });
    // 显式重新登录建立新会话，不保留旧 Access。
    return { success: true };
  }
}
