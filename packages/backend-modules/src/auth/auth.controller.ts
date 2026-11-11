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
import { LoginCaptchaService } from './login-captcha.service';
import {
  ChangePasswordDto,
  LoginDto,
  LoginCaptchaChallengeResponse,
  LoginCaptchaVerifyResponse,
  VerifyLoginCaptchaDto,
  MenuResponse,
  SuccessResponse,
  TokenResponse,
  UserResponse,
} from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly captcha: LoginCaptchaService,
  ) {}
  @Public()
  @Post('captcha/challenge')
  @HttpCode(200)
  @ApiOkResponse({ type: LoginCaptchaChallengeResponse })
  challenge(
    @CurrentRequest() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ): LoginCaptchaChallengeResponse {
    this.origin(req);
    const result = this.captcha.challenge(
      (req.cookies as Record<string, string>).dp_captcha,
    );
    res.cookie('dp_captcha', result.browser, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.APP_ENV === 'production',
      path: '/api/v1/auth',
      maxAge: 120_000,
    });
    return { challengeId: result.challengeId, expiresAt: result.expiresAt };
  }
  @Public()
  @Post('captcha/verify')
  @HttpCode(200)
  @ApiOkResponse({ type: LoginCaptchaVerifyResponse })
  verifyCaptcha(
    @Body() dto: VerifyLoginCaptchaDto,
    @CurrentRequest() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ): LoginCaptchaVerifyResponse {
    this.origin(req);
    const browser = (req.cookies as Record<string, string>).dp_captcha;
    const result = this.captcha.verify(dto.challengeId, dto.progress, browser);
    res.cookie('dp_captcha', browser, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.APP_ENV === 'production',
      path: '/api/v1/auth',
      maxAge: 120_000,
    });
    return result;
  }
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
    this.captcha.consume(
      dto.captchaToken,
      (req.cookies as Record<string, string>).dp_captcha,
    );
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
  async me(@CurrentRequest() req: AppRequest): Promise<UserResponse> {
    const p = req.principal;
    return {
      userId: p.userId,
      username: p.username,
      realName: p.realName,
      roles: p.roles,
      isSuperAdmin: p.isSuperAdmin,
      mustChangePassword: p.mustChangePassword,
      homePath: p.mustChangePassword
        ? '/auth/change-password'
        : ((await this.auth.menus(p)).find((m) => m.type === 'page')?.path ??
          '/account/sessions'),
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
  async menus(@CurrentRequest() req: AppRequest): Promise<MenuResponse[]> {
    const p = req.principal;
    if (p.mustChangePassword) return [];
    const menus = await this.auth.menus(p);
    const build = (parentId: string | null): MenuResponse[] =>
      menus
        .filter((m) => m.parentId === parentId)
        .map((m) => ({
          name: m.name,
          path: m.path,
          component:
            m.type === 'directory'
              ? 'BasicLayout'
              : m.type === 'link'
                ? 'IFrameView'
                : m.component,
          meta: {
            title: m.title,
            icon: m.icon,
            order: m.sort,
            hideInMenu: !m.visible,
            ...(m.type === 'link' ? { link: m.path } : {}),
          },
          children: build(m.id),
        }));
    return [
      ...build(null),
      {
        name: 'AccountSessions',
        path: '/account/sessions',
        component: '/system/sessions/index',
        meta: { title: '我的会话', icon: 'lucide:shield' },
        children: [],
      },
    ];
  }
}
