import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { MailService } from '../../common/mailer/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/LoginDto.dto';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/update-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * TODO ======================= SIGNUP =========================
   * //* Create a new user and return access + refresh tokens
   */
  @Post('signup')
  async signup(
    @Body() dto: CreateUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    //! Capture client IP and User-Agent for audit/security
    const ip = req.ip;
    const userAgent = req.get('user-agent') ?? undefined;
    const response = await this.authService.signup(dto, ip, userAgent);
    if (response) {
      //? Set HttpOnly refresh token cookie
      res.cookie('refresh_token', response.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: response.refreshExpiresAt.getTime() - Date.now(),
      });

      //* Return access token + user info
      return {
        accessToken: response.accessToken,
        user: response.user,
      };
    }
  }

  /**
   * TODO ======================= LOGIN ==========================
   * //* Verify credentials and return access + refresh tokens
   */
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!dto.email && !dto.username) {
      throw new BadRequestException(
        'Either email or username must be provided',
      );
    }
    if (dto.email && dto.username) {
      throw new BadRequestException(
        'Provide either email or username, not both',
      );
    }

    const ip = req.ip;
    const userAgent = req.get('user-agent') ?? undefined;

    const { transformedUser, accessToken, refreshToken, refreshExpiresAt } =
      await this.authService.login(dto, ip, userAgent);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshExpiresAt.getTime() - Date.now(),
    });

    return {
      accessToken,
      user: transformedUser,
    };
  }

  /**
   * TODO ======================= REFRESH TOKEN ==================
   * //* Rotate refresh token and issue new access token
   */ //* Sends new access token and sets a new refresh cookie
  @HttpCode(HttpStatus.OK)
  @Get('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const getRefreshToken = (req: Request): string | undefined => {
      //* Check cookies with type guard
      if (
        req.cookies &&
        typeof req.cookies === 'object' &&
        'refresh_token' in req.cookies
      ) {
        return String(req.cookies.refresh_token);
      }

      //* Check body with type guard
      if (
        req.body &&
        typeof req.body === 'object' &&
        'refreshToken' in req.body
      ) {
        return String(req.body.refreshToken);
      }

      return undefined;
    };

    const refreshToken = getRefreshToken(req);
    if (!refreshToken) {
      //! Unauthorized if no refresh token provided
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const ip = req.ip;
    const userAgent = req.get('user-agent') ?? undefined;

    const {
      token: newRefreshToken,
      expiresAt,
      userId,
      role,
    } = await this.tokenService.rotateRefreshToken(refreshToken, ip, userAgent);

    const accessToken = await this.tokenService.createAccessToken(userId, role);

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresAt.getTime() - Date.now(),
    });

    return { accessToken };
  }

  /**
   * TODO ======================= LOGOUT =========================
   * //* Revoke refresh token(s) and clear cookie
   */
  @HttpCode(HttpStatus.NO_CONTENT)
  @Get('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
      //! Clear cookie
      res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' });
      return;
    }
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout-all')
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId } = req.body.userId as { userId: string };
    await this.tokenService.revokeAllForUser(userId);
    res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' });
  }
  /**
   * TODO ================= REQUEST PASSWORD RESET =================
   * //* Generates a reset token and sends email
   */
  @Post('request-password-reset')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    //! Always respond with generic message to prevent email enumeration
    await this.authService.geeneratePasswordResetToken(dto.email);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  /**
   * TODO ===================== RESET PASSWORD ====================
   * //* Verify token, update password, revoke old tokens
   */
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Query('token') token: string,
  ) {
    if (dto.token || token) {
      const overallToken = dto.token || token;
      await this.authService.resetPasswordWithToken(
        overallToken,
        dto.newPassword,
      );
      return { message: 'Password has been reset successfully.' };
    }
    return { message: 'A valid token sent to your email is needed' };
  }

  /**
   * TODO ===================== VERIFY EMAIL ======================
   * //* Verify the email token and mark user as verified
   */
  @Get('verify-email')
  async verifyEmail(@Req() req: Request, @Query('token') token: string) {
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    await this.tokenService.verifyEmailToken(token, 'VERIFY', ip, userAgent);
    return { message: 'Email verified successfully.' };
  }
}
/**
 * TODO ===================== TEST THE  EMAIL ======================
 * //* Verify the email token and mark user as verified
 */
@Controller('email')
export class MailTestController {
  constructor(private readonly mailer: MailService) {}

  @Get('test')
  async sendTest(@Query('to') to: string) {
    await this.mailer.sendVerificationEmail(to, 'lksdflksdajflksda', 'Peter');
    return { message: `Test Email sent to ${to}` };
  }
}
