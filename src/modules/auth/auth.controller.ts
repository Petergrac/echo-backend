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
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { MailService } from '../../common/mailer/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/LoginDto.dto';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/update-user.dto';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   ** Sign up a new user
   */
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account, sends verification email, and returns authentication tokens',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    headers: {
      'Set-Cookie': {
        description:
          'Sets HttpOnly cookies with access_token and refresh_token',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  @ApiBody({ type: CreateUserDto })
  @Post('signup')
  async signup(
    @Body() dto: CreateUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip;
    const userAgent = req.get('user-agent') ?? undefined;

    const response = await this.authService.signup(dto, ip, userAgent);

    if (response) {
      //* Refresh token cookie
      res.cookie('refresh_token', response.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: response.refreshExpiresAt.getTime() - Date.now(),
        path: '/',
      });

      //* Access token cookie
      res.cookie('access_token', response.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 15,
        path: '/',
      });

      return;
    }
  }

  /**
   ** Login user
   */
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email/username and password',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    headers: {
      'Set-Cookie': {
        description:
          'Sets HttpOnly cookies with access_token (15min) and refresh_token (7days)',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid credentials or request format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
  })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @ApiBody({ type: LoginDto })
  @Throttle({ default: { ttl: 6000, limit: 3 } })
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

    const { accessToken, refreshToken, refreshExpiresAt } =
      await this.authService.login(dto, ip, userAgent);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshExpiresAt.getTime() - Date.now(),
      path: '/',
    });
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15,
      path: '/',
    });
    return;
  }

  /**
   ** Refresh authentication tokens
   */
  @ApiOperation({
    summary: 'Refresh authentication tokens',
    description: 'Uses refresh token to get new access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Token rotated' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No refresh token provided or invalid token',
  })
  @ApiResponse({ status: 403, description: 'Refresh token invalid or expired' })
  @ApiQuery({
    name: 'refresh_token',
    required: false,
    description: 'Refresh token (can also be sent in cookies)',
  })
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
      path: '/',
    });
    //* Access token cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15,
      path: '/',
    });
    return {
      success: true,
      message: 'Token rotated',
    };
  }

  /**
   ** Logout current device
   */
  @ApiOperation({
    summary: 'Logout from current device',
    description: 'Revokes refresh token for current session and clears cookies',
  })
  @ApiResponse({
    status: 204,
    description: 'Logout successful',
    headers: {
      'Set-Cookie': {
        description: 'Clears authentication cookies',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No valid session found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Get('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies as { refresh_token: string | undefined })
      .refresh_token;
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
      //! Clear cookie
      res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' });
      res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax' });

      return { success: true };
    }
  }

  /**
   * Logout from all devices
   */
  @ApiOperation({
    summary: 'Logout from all devices',
    description: 'Revokes all refresh tokens for the user across all devices',
  })
  @ApiResponse({
    status: 204,
    description: 'Logged out from all devices successfully',
    headers: {
      'Set-Cookie': {
        description: 'Clears authentication cookies',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid access token required',
  })
  @ApiBearerAuth('access_token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { userId } = req.user as { userId: string };
      await this.tokenService.revokeAllForUser(userId);
      res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' });
      res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax' });
      return { success: true };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   ** Request password reset
   */
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends password reset email to the provided email address if it exists',
  })
  @ApiResponse({
    status: 200,
    description: 'If email exists, reset link has been sent',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If that email exists, a reset link has been sent.',
        },
      },
    },
  })
  @ApiBody({ type: RequestPasswordResetDto })
  @Post('request-password-reset')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    //! Always respond with generic message to prevent email enumeration
    await this.authService.generatePasswordResetToken(dto.email);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  /**
   ** Reset password
   */
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Reset user password using token from email',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password has been reset successfully.',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Invalid or expired token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiQuery({
    name: 'token',
    required: false,
    description: 'Password reset token (can also be sent in body)',
  })
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
   ** Verify email
   */
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify email using token sent to email',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Email verified successfully.',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Email verification token from email',
  })
  @Get('verify-email')
  async verifyEmail(@Req() req: Request, @Query('token') token: string) {
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    await this.tokenService.verifyEmailToken(token, 'VERIFY', ip, userAgent);
    return { message: 'Email verified successfully.' };
  }
}

/**
 ** Email test controller (for development only)
 */
@ApiTags('Testing')
@Controller('email')
export class MailTestController {
  constructor(private readonly mailer: MailService) {}

  @ApiExcludeEndpoint() // Hide this endpoint in production
  @Get('test')
  async sendTest(@Query('to') to: string) {
    await this.mailer.sendVerificationEmail(to, 'lksdflksdajflksda', 'Peter');
    return { message: `Test Email sent to ${to}` };
  }
}
