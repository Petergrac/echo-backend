import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaService } from '../../common/services/prisma.service';
import { LoginDto, SignUpDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import { AuditService } from '../../common/services/audit.service';
import { MailService } from '../../common/mailer/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: TokenService, // handle JWTs and refresh tokens
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  /**
   *TODO ==================== SIGNUP - create user and return tokens
   */
  async signup(dto: SignUpDto, ip?: string, userAgent?: string) {
    //* 0. Check if email or username already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      const fieldTaken =
        existingUser.email === dto.email ? 'email' : 'username';
      throw new ConflictException(`${fieldTaken} already in use`);
    }

    //* 1. Hash password
    const passwordHash = await argon2.hash(dto.password);

    //* 2. Create user in DB
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
      },
    });

    //* 3. Generate access token

    const accessToken = await this.tokenService.createAccessToken(user.id);

    //* 4. Generate refresh token (hashed in DB)
    const { token: refreshToken, expiresAt } =
      await this.tokenService.createRefreshToken(user.id, ip, userAgent);

    //* 5. Generate email verification token
    const { plain: emailToken } = await this.tokenService.createEmailToken(
      user.id,
      'VERIFY',
    );
    //TODO: Send email (non-blocking option: await or not) & audit
    await this.mailService.sendVerificationEmail(
      user.email,
      emailToken,
      user.username,
    );
    await this.auditService.log(user.id, 'SIGNUP_SUCCESS', { ip, userAgent });
    await this.auditService.log(user.id, 'EMAIL_VERIFICATION_SENT', {
      ip,
      userAgent,
    });

    return { user, accessToken, refreshToken, refreshExpiresAt: expiresAt };
  }

  /**
   * TODO ====================== LOGIN - verify user credentials and return tokens =======
   */
  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    //* Check for the username or email
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });
    //* 1.Verify the password and user
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      //? Log in case the login fails
      await this.auditService.log(null, 'LOGIN_FAILED', { ip, userAgent });
      throw new UnauthorizedException('Invalid credentials');
    }

    //* 2. Create access token and refresh token
    const accessToken = await this.tokenService.createAccessToken(user.id);
    const { token: refreshToken, expiresAt } =
      await this.tokenService.createRefreshToken(user.id, ip, userAgent);
    await this.auditService.log(user.id, 'LOGIN_SUCCESS', { ip, userAgent });
    return { user, accessToken, refreshToken, refreshExpiresAt: expiresAt };
  }

  /**
   *TODO===================== GENERATE RESET TOKEN ================
   */
  async generatePasswordResetToken(
    email: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    //! Return generic response
    if (!user) return;
    const { plain: resetToken } = await this.tokenService.createEmailToken(
      user.id,
      'RESET',
    );

    //* Send email (non-blocking)
    await this.mailService.sendPasswordResetEmail(email, resetToken);
    //? Log the audit
    await this.auditService.log(user.id, 'PASSWORD_RESET_REQUEST', {
      ip,
      userAgent,
    });
  }

  /**
   *TODO===================== RESET PASSWORD WITH TOKEN ================
   */
  async resetPasswordWithToken(
    token: string,
    newPassword: string,
    ip?: string,
    userAgent?: string,
  ) {
    //* Find the token record
    const tokenRecord = await this.prisma.emailToken.findFirst({
      where: {
        type: 'RESET',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) throw new ForbiddenException('Invalid or expired token');

    //* Verify token hash
    const valid = await argon2.verify(tokenRecord.tokenHash, token);
    if (!valid) throw new ForbiddenException('Invalid token');

    //TODO Reset the user password
    const passwordHash = await argon2.hash(newPassword);
    //? Update the hash in the database
    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash },
    });

    //! Revoke all refresh tokens
    await this.tokenService.revokeAllForUser(tokenRecord.userId);

    //! Mark token as used
    await this.prisma.emailToken.update({
      where: { id: tokenRecord.id },
      data: { used: true },
    });

    //? Audit log
    await this.auditService.log(
      tokenRecord.userId,
      'PASSWORD_RESET_COMPLETED',
      { ip, userAgent },
    );
  }
}
