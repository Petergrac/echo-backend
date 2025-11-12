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
import { AuditService } from '../services/audit.service';

@Injectable()
export class CustomArcjetGuard implements CanActivate {
  constructor(
    @Inject(ARCJET) private readonly arcjet: ArcjetNest,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const arcjetReq: ArcjetNestRequest = {
      ...req,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      id: String((req as any).userId ?? ''),
    };

    // Safely extract userId (handle both authenticated and unauthenticated requests)
    const userId = this.extractUserId(req);

    const decision: ArcjetDecision = await this.arcjet.protect(arcjetReq);

    // Inspect decision
    if (decision.isDenied()) {
      // Determine cause
      if (decision.reason.isBot()) {
        //*! Log if Bot is detected
        await this.auditService.log(userId, 'BOT_DETECTED', {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          path: req.path,
          method: req.method,
          botType: decision.reason.type,
        });
        throw new HttpException(
          { error: 'BotDetected', message: 'Automated traffic blocked' },
          HttpStatus.FORBIDDEN,
        );
      }
      if (decision.reason.isRateLimit()) {
        //TODO ===> LOG RATE LIMIT
        await this.auditService.log(userId, 'RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          path: req.path,
          method: req.method,
          window: decision.reason.window,
          limit: decision.reason.max,
          remaining: decision.reason.remaining,
          retryAfter: decision.reason.resetTime,
          resetTime: decision.reason.resetTime,
        });
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
      //TODO====> Generic denial - log as suspicious activity
      await this.auditService.log(userId, 'SUSPICIOUS_ACTIVITY', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        path: req.path,
        method: req.method,
        reason: decision.reason.type,
        action: 'BLOCKED',
      });

      //? generic denial
      throw new HttpException(
        { error: 'AccessDenied', message: 'Access denied by security rules.' },
        HttpStatus.FORBIDDEN,
      );
    }

    //TODO===> Log successful requests that passed security checks (optional)
    if (decision.reason.isBot() && !decision.isDenied()) {
      // Bot was detected but allowed (e.g., search engines)
      await this.auditService.log(userId, 'BOT_DETECTED', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        path: req.path,
        method: req.method,
        botType: decision.reason.type,
        action: 'ALLOWED',
      });
    }

    // If allowed:
    return true;
  }

  private extractUserId(req: Request): string | null {
    // Check if user exists and has either userId or id property
    if (req.user) {
      const user = (req.user as { userId: string }).userId;
      if (!user) return (req.user as { id: string }).id || null;
    }
    return null;
  }
}
