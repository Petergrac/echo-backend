/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsGuard implements CanActivate {
  private readonly logger = new Logger(WsGuard.name);

  constructor(private readonly jwtService: JwtService) {}
  async canActivate(context: ExecutionContext) {
    try {
      //* 1.Extract user data from the context
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromHeader(client);
      if (!token) {
        throw new WsException('Unauthorized');
      }
      //* 2.Verify payload
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      client.data.user = payload;
      return true;
    } catch (error) {
      this.logger.error('websocket authentication failed', error.message);
      throw new WsException('Unauthorized');
    }
  }
  //? =========>>>>>> PRIVATE METHOD <<<<<<<<==================
  private extractTokenFromHeader(client: Socket): string | undefined {
    const [type, token] = client.handshake.auth?.token?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
