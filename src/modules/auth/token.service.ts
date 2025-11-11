import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/services/prisma.service';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { AuditService } from './audit.service';
import { AuditAction } from '../../generated/prisma/enums';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   *TODO ======================= CREATE ACCESS TOKEN METHOD =================
   *
   */
  createAccessToken(userId: string): Promise<string> {
    const payload = { sub: userId };
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
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 1000); //? Refresh token for 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenId: strings[1],
        hashedToken: hashed,
        expiresAt,
        ip,
        userAgent,
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

    //* Find a given token based on the token Id
    const candidate = await this.prisma.refreshToken.findUnique({
      where: { tokenId },
    });
    if (!candidate) throw new ForbiddenException('Invalid refresh token');
    // * Verify the user refresh token id with that in the database
    const ok = await argon2
      .verify(candidate.hashedToken, plain)
      .catch(() => false);

    //* If reused(crucial for logout) or expired -> revoke and audit
    if (!ok || candidate.expiresAt < new Date() || candidate.revoked) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: candidate.userId, revoked: false },
        data: { revoked: true },
      });

      //? audit it
      await this.auditService.log(candidate.userId, AuditAction.TOKEN_ROTATED, {
        tokenId,
        ip,
        userAgent,
      });
      throw new ForbiddenException('Refresh token invalid or expired'); //* Need to login to get a new refresh token
    }

    //? revoke specific token candidate & audit
    await this.prisma.refreshToken.update({
      where: { id: candidate.id },
      data: { revoked: true, lastUsedAt: new Date() },
    });
    await this.auditService.log(candidate.userId, 'REFRESH_ROTATED', {
      tokenId,
      ip,
      userAgent,
    });

    //* create new token and return compound
    const newCompound = await this.createRefreshToken(
      candidate.userId,
      ip,
      userAgent,
    );
    return {
      token: newCompound.token,
      expiresAt: newCompound.expiresAt,
      userId: candidate.userId,
    };
  }
  /**
   *TODO ======================= REVOKE ALL TOKENS METHOD =================
   *
   */
  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    await this.auditService.log(userId, AuditAction.LOGOUT_ALL);
    await this.auditService.log(userId, 'TOKEN_REVOKED_MANUALLY', {});
  }
  /**
   *TODO ======================= REVOKE A SPECIFIC TOKEN METHOD =================
   *
   */
  async revokeRefreshToken(compoundToken: string) {
    const [tokenId, plain] = compoundToken.split('.');
    if (!tokenId || !plain) throw new ForbiddenException('Invalid token');

    //* Find a given token based on the token Id
    const candidate = await this.prisma.refreshToken.findUnique({
      where: { tokenId },
    });
    if (!candidate) throw new ForbiddenException('Invalid refresh token');
    // * Verify the user refresh token id with that in the database
    const ok = await argon2
      .verify(candidate.hashedToken, plain)
      .catch(() => false);
    //? revoke specific token candidate & audit
    if (ok) {
      await this.prisma.refreshToken.update({
        where: { id: candidate.id },
        data: { revoked: true, lastUsedAt: new Date() },
      });
      await this.auditService.log(candidate.userId, 'LOGOUT');
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
    const plain = randomBytes(24).toString('hex');
    const hash = await argon2.hash(plain);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.emailToken.create({
      data: { userId, tokenHash: hash, type, expiresAt },
    });
    return { plain, expiresAt };
  }
  /*
   * //TODO ======================= VERIFY EMAIL TOKEN =================
   *
   */
  async verifyEmailToken(
    plain: string,
    type: 'VERIFY' | 'RESET',
    ip?: string,
    userAgent?: string,
  ) {
    const tokens = await this.prisma.emailToken.findMany({
      where: { type, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    for (const t of tokens) {
      if (await argon2.verify(t.tokenHash, plain)) {
        await this.prisma.$transaction([
          this.prisma.emailToken.update({
            where: { id: t.id },
            data: { used: true },
          }),
          this.prisma.user.update({
            where: { id: t.userId },
            data: { emailVerified: true },
          }),
          this.prisma.auditLog.create({
            data: {
              userId: t.userId,
              action: AuditAction.EMAIL_VERIFIED,
              meta: { ip: ip ?? null, userAgent: userAgent ?? null },
            },
          }),
        ]);
        return t.userId;
      }
    }

    throw new Error('Invalid or expired token');
  }
}
