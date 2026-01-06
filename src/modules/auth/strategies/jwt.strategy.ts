import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  role: string;
  isBanned: boolean;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req.cookies?.access_token as string | null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.get<string>('JWT_SECRET')!,
      ignoreExpiration: false,
    });
  }

  validate(payload: JwtPayload) {
    if (payload.isBanned) {
      throw new ForbiddenException('Account is banned');
    }
    return {
      userId: payload.sub,
      role: payload.role,
    };
  }
}
