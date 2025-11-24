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

import { AuditLogService } from '../services/audit.service';
import { AuditAction, AuditResource, RiskEvent } from '../enums/audit.enums';

@Injectable()
export class CustomArcjetGuard implements CanActivate {
  constructor(
    @Inject(ARCJET) private readonly arcjet: ArcjetNest,
    private readonly auditService: AuditLogService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    //TODO ============ EXTRACT USER ID FROM CONTEXT
    const req = context.switchToHttp().getRequest<Request>();
    const userId = this.extractUserId(req);
    const arcjetReq: ArcjetNestRequest = {
      ...req,
      id: userId ?? '',
    };
    const decision: ArcjetDecision = await this.arcjet.protect(arcjetReq);

    /** -----------------------
     *! ========  HANDLE DENIED REQUESTS
     * ----------------------*/
    if (decision.isDenied()) {
      /**
       * ! BOT DETECTED */
      if (decision.reason.isBot()) {
        await this.auditService.createLog({
          action: AuditAction.FAILED_LOGIN,
          resource: AuditResource.AUTH,
          riskEvent: RiskEvent.ABUSE,
          userId: userId || undefined,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          metadata: {
            path: req.path,
            method: req.method,
            botType: decision.reason.type,
          },
        });

        throw new HttpException(
          {
            error: 'BotDetected',
            message: 'Automated traffic blocked',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      /*
      TODO ======= RATE LIMIT HIT */
      if (decision.reason.isRateLimit()) {
        await this.auditService.createLog({
          action: AuditAction.RATE_LIMITED,
          resource: AuditResource.AUTH,
          riskEvent: RiskEvent.RATE_LIMIT_TRIGGERED,
          userId: userId || undefined,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          metadata: {
            path: req.path,
            method: req.method,
            window: decision.reason.window,
            limit: decision.reason.max,
            remaining: decision.reason.remaining,
            retryAfter: decision.reason.resetTime,
          },
        });

        throw new HttpException(
          {
            error: 'RateLimitExceeded',
            message: 'Too many requests. Try again after.',
            retryAfter: decision.reason.resetTime
              ? Math.ceil(
                  (new Date(decision.reason.resetTime).getTime() - Date.now()) /
                    1000,
                ) + 's'
              : undefined,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      /**
       * TODO GENERIC SUSPICIOUS BLOCK */
      await this.auditService.createLog({
        action: AuditAction.FAILED_LOGIN,
        resource: AuditResource.AUTH,
        riskEvent: RiskEvent.ANOMALY,
        userId: userId || undefined,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          path: req.path,
          method: req.method,
          reason: decision.reason.type,
        },
      });

      throw new HttpException(
        {
          error: 'AccessDenied',
          message: 'Access denied by security rules.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    /** -----------------------
     * * ALLOWED REQUESTS (Optional logging)
     * ----------------------*/

    if (decision.reason.isBot() && !decision.isDenied()) {
      await this.auditService.createLog({
        action: AuditAction.USER_UPDATED,
        resource: AuditResource.AUTH,
        riskEvent: RiskEvent.ANOMALY,
        userId: userId || undefined,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          path: req.path,
          method: req.method,
          botType: decision.reason.type,
          allowed: true,
        },
      });
    }

    return true;
  }

  private extractUserId(req: Request): string | null {
    if (req.user) {
      const userId = (req.user as { userId: string }).userId;
      return userId;
    }
    return null;
  }
}
