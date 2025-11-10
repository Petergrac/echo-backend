import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/services/prisma.service';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  //* This method is for creating access tokens
  createAccessToken(userId: string): Promise<string> {
    const payload = { sub: userId };
    return this.jwt.signAsync(payload, { expiresIn: '15m' });
  }

  //* Function to generate plain token
  private generatePlainToken(): string {
    return randomBytes(48).toString('hex'); //! This will generate strong random
  }

  //* This method is used to create a refresh token
  async createRefreshToken(
    userId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const plain = this.generatePlainToken();
    const hashed = await argon2.hash(plain);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 1000); //? Refresh token for 7 days

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.refreshToken.create({
      data: {
        userId,
        hashedToken: hashed,
        expiresAt,
        ip,
        userAgent,
      },
    });

    return { token: plain, expiresAt };
  }
  //* Rotate the refresh token
  async rotateRefreshToken(oldPlain: string, ip?: string, userAgent?: string) {
    //* Find matching refresh token by testing hashes
    const candidate = await this.prisma.refreshToken.findFirst({
      where: { revoked: false },
      orderBy: { createdAt: 'desc' }, //? optional performance tradeoff
    });

    if (!candidate) throw new ForbiddenException('Invalid refresh token');

    const ok = await argon2
      .verify(candidate.hashedToken, oldPlain)
      .catch(() => false);
    if (!ok || candidate.expiresAt < new Date() || candidate.revoked) {
      //* If reused or expired -> revoke and audit
      await this.prisma.refreshToken.updateMany({
        where: { userId: candidate.userId, revoked: false },
        data: { revoked: true },
      });
      throw new ForbiddenException('Refresh token invalid or expired');
    }

    //? revoke candidate
    await this.prisma.refreshToken.update({
      where: { id: candidate.id },
      data: { revoked: true, lastUsedAt: new Date() },
    });

    //* create new refresh token
    const { token, expiresAt } = await this.createRefreshToken(
      candidate.userId,
      ip,
      userAgent,
    );

    // todo Returns the new token
    return { token, expiresAt, userId: candidate.userId };
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}
