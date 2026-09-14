import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { clientIp, userAgent } from '../common/util/request-context.js';
import { AuthService } from './auth.service.js';
import { REFRESH_COOKIE, TokensService, type AccessTokenPayload } from './tokens.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto.js';
import { ResendVerificationDto, VerifyEmailDto } from './dto/verify.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

  private context(request: Request) {
    return { ipAddress: clientIp(request), userAgent: userAgent(request) };
  }

  private refreshTokenFrom(request: Request) {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_COOKIE];
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(dto, this.context(request));

    this.tokens.setAuthCookies(response, result.accessToken, result.refresh);

    return {
      user: await this.auth.currentUser(result.user.id),
      verificationToken: result.verificationToken,
    };
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto, this.context(request));

    this.tokens.setAuthCookies(response, result.accessToken, result.refresh);

    return { user: await this.auth.currentUser(result.user.id) };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = this.refreshTokenFrom(request);

    if (!token) {
      throw new UnauthorizedException('No session to refresh');
    }

    const result = await this.auth.refresh(token, this.context(request));

    this.tokens.setAuthCookies(response, result.accessToken, result.refresh);

    return { refreshed: true };
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = this.refreshTokenFrom(request);
    const user = (request as Request & { user?: AccessTokenPayload }).user;

    await this.auth.logout(token, user?.sub, this.context(request));
    this.tokens.clearAuthCookies(response);

    return { loggedOut: true };
  }

  @HttpCode(200)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser('sub') userId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logoutEverywhere(userId, this.context(request));
    this.tokens.clearAuthCookies(response);

    return { loggedOut: true };
  }

  @Get('me')
  async me(@CurrentUser('sub') userId: string) {
    return this.auth.currentUser(userId);
  }

  @Get('sessions')
  async sessions(@CurrentUser('sub') userId: string, @Req() request: Request) {
    return this.auth.listSessions(userId, this.refreshTokenFrom(request));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() request: Request) {
    return this.auth.verifyEmail(dto.token, this.context(request));
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @HttpCode(200)
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto, @Req() request: Request) {
    return this.auth.resendVerification(dto.email, this.context(request));
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    return this.auth.forgotPassword(dto.email, this.context(request));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.resetPassword(dto.token, dto.password, this.context(request));
    this.tokens.clearAuthCookies(response);

    return result;
  }

  @HttpCode(200)
  @Post('change-password')
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
      this.context(request),
    );

    this.tokens.clearAuthCookies(response);

    return result;
  }
}
