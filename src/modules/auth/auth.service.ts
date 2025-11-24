import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FindOptionsWhere, MoreThan, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as argon2 from 'argon2';
import { MailService } from '../../common/mailer/mail.service';
import { TokenService } from './token.service';
import {
  AuditLogInput,
  AuditLogService,
} from '../../common/services/audit.service';
import { AuditAction, AuditResource } from '../../common/enums/audit.enums';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';
import { LoginDto } from './dto/LoginDto.dto';
import { EmailToken } from './entities/email-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly audiService: AuditLogService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(EmailToken)
    private readonly emailRepo: Repository<EmailToken>,
    private readonly mailService: MailService,
  ) {}

  /**
   * TODO ========================= SIGN UP ================
   * @param dto
   * @param ip
   * @param userAgent
   * @returns //? ACCESS TOKEN , REFRESH TOKEN , SAVED USER
   */
  async signup(
    dto: CreateUserDto,
    ip?: string,
    userAgent?: string,
  ): Promise<
    | {
        user: UserResponseDto;
        accessToken: string;
        refreshToken: string;
        refreshExpiresAt: Date;
      }
    | undefined
  > {
    //* 1.Check if user with unique data exists
    const existingUser = await this.userRepo
      .createQueryBuilder('user')
      .where('user.email = :email', { email: dto.email })
      .orWhere('user.username = :username', { username: dto.username })
      .getOne();
    if (existingUser) {
      const fieldTaken =
        existingUser.email === dto.email ? 'email' : 'username';
      throw new ConflictException(`${fieldTaken} already exists`);
    }
    //* 2. Hash Password
    console.log(dto.password);
    const passwordHash = await argon2.hash(dto.password);
    const user = this.userRepo.create({
      ...dto,
      passwordHash,
    });
    //* 3. Save the user in the database
    const savedUser = await this.userRepo.save(user);

    //* 4. Generate access token
    const accessToken = await this.tokenService.createAccessToken(
      user.id,
      user.role,
    );

    //* 5. Generate refresh token (hashed in DB)
    const { token: refreshToken, expiresAt } =
      await this.tokenService.createRefreshToken(user.id, ip, userAgent);

    //* 6. Generate email verification token
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
    //* 7.Audit if successful
    const log: AuditLogInput = {
      action: AuditAction.EMAIL_VERIFICATION_SENT,
      ip,
      userAgent,
      userId: savedUser.id,
      resource: AuditResource.AUTH,
    };
    const log2: AuditLogInput = {
      action: AuditAction.SIGNUP,
      ip,
      userAgent,
      userId: savedUser.id,
      resource: AuditResource.AUTH,
    };
    await this.audiService.createLog(log);
    await this.audiService.createLog(log2);

    const transformedUser = plainToInstance(UserResponseDto, savedUser, {
      excludeExtraneousValues: true,
    });
    //* Return the response
    return {
      user: transformedUser,
      refreshToken,
      accessToken,
      refreshExpiresAt: expiresAt,
    };
  }

  /**
   * TODO ===================== LOGIN USER ================
   * @param dto
   * @param ip
   * @param userAgent
   * @returns
   */
  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    //* 0.Check if user exists
    const user = await this.userRepo.findOne({
      where: [
        { email: dto.email },
        { username: dto.username },
      ] as FindOptionsWhere<User>[],
    });
    //* 1.Verify the password and user
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      //? Log in case the login fails
      const log: AuditLogInput = {
        action: AuditAction.FAILED_LOGIN,
        resource: AuditResource.AUTH,
        ip,
        userAgent,
        metadata: {
          dto,
        },
      };
      await this.audiService.createLog(log);
      throw new UnauthorizedException('Invalid credentials');
    }
    //* 2. Create access token and refresh token
    const accessToken = await this.tokenService.createAccessToken(
      user.id,
      user.role,
    );
    const { token: refreshToken, expiresAt } =
      await this.tokenService.createRefreshToken(user.id, ip, userAgent);
    //* 3.Log the message
    await this.audiService.createLog({
      action: AuditAction.LOGIN,
      resource: AuditResource.AUTH,
      ip,
      userAgent,
      userId: user.id,
    });
    //* 4.Transform UserResponse
    const transformedUser = plainToInstance(UserResponseDto, User, {
      excludeExtraneousValues: true,
    });

    return {
      transformedUser,
      refreshToken,
      accessToken,
      refreshExpiresAt: expiresAt,
    };
  }
  /**
   * TODO ====================== REQUEST PASSWORD RESET TOKEN (EMAIL) =========
   * @param email
   * @param ip
   * @param userAgent
   * @returns
   */
  async geeneratePasswordResetToken(
    email: string,
    ip?: string,
    userAgent?: string,
  ) {
    //* 1. Get user from the database
    const user = await this.userRepo.findOneBy({
      email,
    });
    //! Return generic response
    if (!user) return { message: `${email} does not exist.` };
    //* 2. Create email token
    try {
      const { plain: resetToken } = await this.tokenService.createEmailToken(
        user.id,
        'RESET',
      );
      //* 3.Send email (non-blocking)
      await this.mailService.sendPasswordResetEmail(email, resetToken);
      //* 4.Log the audit
      await this.audiService.createLog({
        action: AuditAction.PASSWORD_RESET_REQUEST,
        resource: AuditResource.AUTH,
        ip,
        userAgent,
      });
    } catch (error) {
      console.log(error);
    }
    return;
  }

  async resetPasswordWithToken(
    token: string,
    newPassword: string,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      //* 1. Get the token
      const tokenRecord = await this.emailRepo.findOne({
        where: {
          type: 'RESET',
          used: false,
          expiresAt: MoreThan(new Date()),
        },
        order: {
          createdAt: 'DESC',
        },
        select: {
          user: {
            id: true,
          },
        },
        relations: ['user'],
      });
      console.log(tokenRecord);
      if (!tokenRecord)
        throw new ForbiddenException('Invalid or expired token');

      //* 2.Verify token hash
      const valid = await argon2.verify(tokenRecord.tokenHash, token);
      if (!valid) throw new ForbiddenException('Invalid token');

      console.log(tokenRecord.user.id);
      //* 3.Update user password
      await this.userRepo.save({
        id: tokenRecord.user.id,
        passwordHash: await argon2.hash(newPassword),
      });
      //* 4 Revoke all valid and active tokens
      await this.tokenService.revokeAllForUser(tokenRecord.user.id);
      //* 5. Mark that email token USED
      await this.emailRepo.update(
        {
          id: tokenRecord.id,
        },
        {
          used: true,
        },
      );
      //* 6 Audit log
      await this.audiService.createLog({
        action: AuditAction.PASSWORD_RESET_COMPLETED,
        resource: AuditResource.AUTH,
        ip,
        userAgent,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
    return;
  }
}
