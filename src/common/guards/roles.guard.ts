/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      ctx.getHandler(),
    );
    if (!requiredRoles) return true;
    const { user } = ctx.switchToHttp().getRequest();
    //!Return false if there is no role
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!user || !user.role)
      throw new ForbiddenException('Insufficient permissions');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    console.log(requiredRoles);
    return requiredRoles.includes(user.role);
  }
}
