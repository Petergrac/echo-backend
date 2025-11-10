import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/services/prisma.service';
import { LoginDto, SignUpDto } from './dto/auth.dto';
import * as argon2 from 'argon2';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // Sign Up Method
  async signup(data: SignUpDto): Promise<{ token: string }> {
    // Hash the Password
    const passwordHash = await argon2.hash(data.password);

    // Perform Read Operation
    const user = await this.prisma.user.create({
      data: { email: data.email, username: data.username, passwordHash },
    });

    return {
      token: this.signToken(user.id, user.email),
    };
  }

  // Login Method
  async login(data: LoginDto): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user || !(await argon2.verify(user.passwordHash, data.password))) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    return {
      token: this.signToken(user.id, user.email),
    };
  }

  // Sign the token
  private signToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwt.sign(payload);
  }
}
