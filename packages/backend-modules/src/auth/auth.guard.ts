import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AppRequest, fail } from '../common/http';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const handlers = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('public', handlers))
      return true;
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const bearer = req.headers.authorization;
    if (!bearer?.startsWith('Bearer ')) fail(401, 'AUTH_REQUIRED', '请先登录');
    req.principal = await this.auth.authenticate(bearer.slice(7));
    const identity = this.reflector.getAllAndOverride<boolean>(
      'identity',
      handlers,
    );
    const permission = this.reflector.getAllAndOverride<string>(
      'permission',
      handlers,
    );
    if (req.principal.mustChangePassword && !identity)
      fail(403, 'AUTH_PASSWORD_CHANGE_REQUIRED', '请先修改初始密码');
    if (!identity && (!permission || !req.principal.permissions[permission]))
      fail(403, 'AUTHZ_DENIED', '没有此操作权限');
    return true;
  }
}
