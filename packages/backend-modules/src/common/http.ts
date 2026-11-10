import type { Request } from 'express';
import {
  createParamDecorator,
  ExecutionContext,
  HttpException,
  SetMetadata,
} from '@nestjs/common';

export interface Principal {
  userId: string;
  sessionId: string;
  securityVersion: number;
  mustChangePassword: boolean;
  username: string;
  realName: string;
  permissions: Record<string, 'ALL' | 'SELF'>;
}
export interface AppRequest extends Request {
  principal: Principal;
  requestId: string;
}
export const Public = () => SetMetadata('public', true);
export const Permission = (code: string) => SetMetadata('permission', code);
export const Identity = () => SetMetadata('identity', true);
export const CurrentRequest = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AppRequest>(),
);
export function fail(
  status: number,
  businessCode: string,
  message: string,
): never {
  throw new HttpException({ businessCode, message }, status);
}
export function validId(id: string): string {
  if (!/^[1-9]\d{0,19}$/.test(id) || BigInt(id) > 18446744073709551615n)
    fail(400, 'VALIDATION_FAILED', 'ID 格式无效');
  return id;
}
