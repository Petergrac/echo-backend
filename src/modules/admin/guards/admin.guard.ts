/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRole } from '../../auth/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor() {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.role !== UserRole.ADMIN && !user.isModerator) {
      throw new ForbiddenException('Admin privileges required');
    }

    return true;
  }
}
