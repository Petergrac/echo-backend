import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ARCJET,
  type ArcjetNest,
  type ArcjetDecision,
  ArcjetNestRequest,
} from '@arcjet/nest';

@Injectable()
export class CustomArcjetGuard implements CanActivate {
  constructor(@Inject(ARCJET) private readonly arcjet: ArcjetNest) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const arcjetReq: ArcjetNestRequest = {
      ...req, // Spread the original request object
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      id: String((req as any).id ?? ''), // Ensure 'id' is a string, handling potential undefined
    };

    // Call protect() with request
    const decision: ArcjetDecision = await this.arcjet.protect(arcjetReq);

    // Inspect decision
    if (decision.isDenied()) {
      // Determine cause
      if (decision.reason.isBot()) {
        throw new HttpException(
          { error: 'BotDetected', message: 'Automated traffic blocked' },
          HttpStatus.FORBIDDEN,
        );
      }
      if (decision.reason.isRateLimit()) {
        throw new HttpException(
          {
            error: 'RateLimitExceeded',
            message: 'Too many requests, retry after ',
            retryAfter: decision.reason.resetTime
              ? Math.ceil(
                  (new Date(decision.reason.resetTime).getTime() - Date.now()) /
                    1000,
                ) + 's'
              : '',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // generic denial
      throw new HttpException(
        { error: 'AccessDenied', message: 'Access denied by security rules.' },
        HttpStatus.FORBIDDEN,
      );
    }

    // If allowed:
    return true;
  }
}
