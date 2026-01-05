import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { AuditLogService } from '../../common/services/audit.service';
import { AuditAction, AuditResource } from '../../common/enums/audit.enums';
import { EmailToken } from './entities/email-token.entity';
import { User } from './entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(EmailToken)
    private readonly emailTokenRepo: Repository<EmailToken>,
    private readonly auditService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   *TODO ======================= CREATE ACCESS TOKEN METHOD =================
   *
   */
  createAccessToken(userId: string, role: string): Promise<string> {
    const payload = { sub: userId, role: role };
    return this.jwt.signAsync(payload, { expiresIn: '15m' });
  }

  /**
   *TODO ======================= GENERATE PLAIN TOKEN METHOD =================
   *
   */
  private generatePlainToken(): string[] {
    return [randomBytes(48).toString('hex'), randomBytes(8).toString('hex')]; //! This will generate strong random
  }

  /**
   *TODO ======================= CREATE REFRESH TOKEN METHOD =================
   *
   */
  async createRefreshToken(
    userId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const strings = this.generatePlainToken();
    const hashed = await argon2.hash(strings[0]);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); //? Refresh token for 7 days

    await this.refreshTokenRepo.save({
      tokenId: strings[1],
      hashedToken: hashed,
      expiresAt,
      ip,
      userAgent,
      user: {
        id: userId,
      },
    });

    return { token: strings[1] + '.' + strings[0], expiresAt };
  }
  /**
   *TODO ======================= ROTATE REFRESH TOKEN METHOD =================
   *
   */
  /** //! What this method does
   * //* Finds last valid refresh token in DB
    //* Verifies hash against provided plain token
    //* Revokes the old one
    //* Creates a new one
   * 
   * @param oldPlain 
   * @param ip 
   * @param userAgent 
   * @returns // * Unrevoked refresh token or a new one
   */
  async rotateRefreshToken(
    compoundToken: string,
    ip?: string,
    userAgent?: string,
  ) {
    const [tokenId, plain] = compoundToken.split('.');
    if (!tokenId || !plain) throw new ForbiddenException('Invalid token');

    //* 1. Find a given token based on the token Id
    const candidate = await this.refreshTokenRepo.findOne({
      where: { tokenId },
      select: {
        id: true,
        hashedToken: true,
        revoked: true,
        expiresAt: true,
        user: {
          id: true,
          role: true,
          isBanned: true,
        },
      },
      relations: ['user'],
    });
    if (!candidate) throw new ForbiddenException('Invalid refresh token');
    if (candidate.user.isBanned) throw new ForbiddenException('User is banned');
    // * 2. Verify the user refresh token id with that in the database
    const ok = await argon2
      .verify(candidate.hashedToken, plain)
      .catch(() => false);
    //* 3. If reused(crucial for logout) or expired -> revoke and audit
    if (!ok || candidate.expiresAt < new Date()) {
      //* Mark it as used if expired or invalid
      await this.refreshTokenRepo.update(
        { id: candidate.id },
        { revoked: true, lastUsedAt: new Date() },
      );
      //? audit it (if the token is expired or invalid)
      await this.auditService.createLog({
        action: AuditAction.REUSED_REFRESH_TOKEN,
        resource: AuditResource.AUTH,
        ip,
        userAgent,
        userId: candidate.user.id,
      });
      throw new ForbiddenException('Refresh token invalid or expired'); //* Need to login to get a new refresh token
    }
    //! Someone is trying to reuse a revoked token
    if (candidate.revoked) {
      //* Revoke all and report of suspicious activity
      await this.refreshTokenRepo.update(
        { user: { id: candidate.user.id }, revoked: false },
        { revoked: true },
      );
      await this.auditService.createLog({
        action: AuditAction.SUSPICIOUS_ACTIVITY,
        resource: AuditResource.AUTH,
        ip,
        userAgent,
        userId: candidate.user.id,
        metadata: {
          token: candidate.tokenId,
        },
      });
      throw new ForbiddenException('This token has been used.');
    }
    //* 4.Revoke specific token candidate & audit
    await this.refreshTokenRepo.update(
      { id: candidate.id },
      { revoked: true, lastUsedAt: new Date() },
    );
    //* Audit the token rotation
    await this.auditService.createLog({
      action: AuditAction.REFRESH_TOKEN_ROTATED,
      resource: AuditResource.AUTH,
      ip,
      userAgent,
      userId: candidate.user.id,
    });
    //* 5. Create new token and return compound
    const newCompound = await this.createRefreshToken(
      candidate.user.id,
      ip,
      userAgent,
    );
    const role = (candidate.user as { role: string }).role;
    return {
      token: newCompound.token,
      role,
      expiresAt: newCompound.expiresAt,
      userId: candidate.user.id,
    };
  }
  /**
   *TODO ======================= REVOKE ALL TOKENS METHOD =================
   *
   */
  async revokeAllForUser(userId: string) {
    //* 1. Revoke all the tokens
    try {
      await this.refreshTokenRepo.update(
        {
          user: {
            id: userId,
          },
          revoked: false,
        },
        { revoked: true },
      );
      //* 2.Audit the action
      await this.auditService.createLog({
        action: AuditAction.LOGOUT,
        resource: AuditResource.AUTH,
        metadata: {
          userId,
        },
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  /**
   *TODO ======================= REVOKE A SPECIFIC TOKEN METHOD =================
   *
   */
  async revokeRefreshToken(compoundToken: string) {
    const [tokenId, plain] = compoundToken.split('.');
    if (!tokenId || !plain) throw new ForbiddenException('Invalid token');

    //* 1.Find a given token based on the token Id
    const candidate = await this.refreshTokenRepo.findOneBy({ tokenId });
    if (!candidate) throw new ForbiddenException('Invalid refresh token');
    // * 2.Verify the user refresh token id with that in the database
    const ok = await argon2
      .verify(candidate.hashedToken, plain)
      .catch(() => false);
    //* 3.revoke specific token candidate & audit
    if (ok) {
      await this.refreshTokenRepo.update(
        { id: candidate.id },
        { revoked: true, lastUsedAt: new Date() },
      );
      await this.auditService.createLog({
        action: AuditAction.REFRESH_TOKEN_ROTATED,
        resource: AuditResource.AUTH,
        metadata: {
          userId: candidate.id,
        },
      });
      return;
    }
    throw new ForbiddenException('Invalid or Expired Token on Logout');
  }
  /*
   * //TODO ======================= CREATE EMAIL TOKEN =================
   *
   */
  async createEmailToken(
    userId: string,
    type: 'VERIFY' | 'RESET',
  ): Promise<{ plain: string; expiresAt: Date }> {
    //* 1.GENERATE RANDOM STRING & HASH
    const plain = randomBytes(24).toString('hex');
    const hash = await argon2.hash(plain);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    //* 2.SAVE THE HASH IN THE DATABASE
    await this.emailTokenRepo.save({
      user: {
        id: userId,
      },
      tokenHash: hash,
      type,
      expiresAt,
    });
    return { plain, expiresAt };
  }
  /*
   * //TODO ======================= VERIFY EMAIL TOKEN =================
   *
   */
  async verifyEmailToken(
    plain: string,
    type: 'RESET' | 'VERIFY',
    ip?: string,
    userAgent?: string,
  ) {
    const tokens = await this.emailTokenRepo.find({
      where: {
        type,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, plain)) {
        return this.dataSource.transaction(async (manager) => {
          await manager.update(EmailToken, token.id, { used: true });
          await manager.update(User, token.user.id, { emailVerified: true });

          await manager.save(AuditLog, {
            user: { id: token.user.id },
            action: AuditAction.EMAIL_VERIFIED,
            ip: ip,
            userAgent: userAgent,
          });

          return token.user.id;
        });
      }
    }
    throw new UnauthorizedException('Invalid or expired token');
  }
}
