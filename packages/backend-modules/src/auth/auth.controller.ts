import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AppRequest,
  CurrentRequest,
  fail,
  Identity,
  Public,
} from '../common/http';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  MenuResponse,
  SuccessResponse,
  TokenResponse,
  UserResponse,
} from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private cookie(res: Response, value: string) {
    res.cookie('dp_refresh', value, {
      httpOnly: true,
      secure: process.env.APP_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 7 * 86400000,
    });
  }
  private clear(res: Response) {
    res.clearCookie('dp_refresh', {
      httpOnly: true,
      secure: process.env.APP_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
  }
  private origin(req: AppRequest) {
    if (req.headers.origin !== process.env.APP_ORIGIN)
      fail(403, 'CSRF_ORIGIN_DENIED', '请求来源不受信任');
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: TokenResponse })
  async login(
    @Body() dto: LoginDto,
    @CurrentRequest() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    const result = await this.auth.login(
      dto.username,
      dto.password,
      req.requestId,
    );
    this.cookie(res, result.cookie);
    return { accessToken: result.accessToken };
  }
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: TokenResponse })
  async refresh(
    @CurrentRequest() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    try {
      const cookies = req.cookies as Record<string, string>;
      const result = await this.auth.refresh(cookies.dp_refresh);
      this.cookie(res, result.cookie);
      return { accessToken: result.accessToken };
    } catch (error) {
      this.clear(res);
      throw error;
    }
  }
  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOkResponse({ type: SuccessResponse })
  async logout(
    @CurrentRequest() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    const result = await this.auth.logout(
      req.headers.authorization,
      (req.cookies as Record<string, string>).dp_refresh,
      req.requestId,
    );
    this.clear(res);
    return result;
  }
  @ApiBearerAuth()
  @Identity()
  @Post('password')
  @HttpCode(200)
  @ApiOkResponse({ type: SuccessResponse })
  async password(
    @Body() dto: ChangePasswordDto,
    @CurrentRequest() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.changePassword(
      req.principal,
      dto.currentPassword,
      dto.newPassword,
      req.requestId,
    );
    this.clear(res);
    return result;
  }
  @ApiBearerAuth()
  @Identity()
  @Get('me')
  @ApiOkResponse({ type: UserResponse })
  me(@CurrentRequest() req: AppRequest): UserResponse {
    const p = req.principal;
    return {
      userId: p.userId,
      username: p.username,
      realName: p.realName,
      roles: ['operator'],
      mustChangePassword: p.mustChangePassword,
      homePath: p.mustChangePassword
        ? '/auth/change-password'
        : '/demo/records',
    };
  }
  @ApiBearerAuth()
  @Identity()
  @Get('permissions')
  @ApiOkResponse({ type: String, isArray: true })
  permissions(@CurrentRequest() req: AppRequest) {
    return req.principal.mustChangePassword
      ? []
      : Object.keys(req.principal.permissions);
  }
  @ApiBearerAuth()
  @Identity()
  @Get('menus')
  @ApiOkResponse({ type: MenuResponse, isArray: true })
  menus(@CurrentRequest() req: AppRequest): MenuResponse[] {
    if (
      req.principal.mustChangePassword ||
      !req.principal.permissions['demo:record:list']
    )
      return [];
    return [
      {
        name: 'Records',
        path: '/demo/records',
        component: '/demo/records/index',
        meta: { title: '设备台账', icon: 'lucide:database' },
      },
    ];
  }
}
