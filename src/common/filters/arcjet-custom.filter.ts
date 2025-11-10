// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ArcjetErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  reason?: string;
  retryAfter?: string;
  botType?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Handle Arcjet-specific errors
    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse() as ArcjetErrorResponse;

      // Check if this is an Arcjet error
      if (errorResponse.reason) {
        let message = 'Access denied';
        let errorType = 'ArcjetProtection';

        switch (errorResponse.reason) {
          case 'BOT':
            message = 'Automated traffic detected and blocked.';
            errorType = 'BotDetection';
            break;

          case 'RATE_LIMIT':
            message = errorResponse.retryAfter
              ? `Too many requests. Please try again in ${errorResponse.retryAfter}.`
              : 'Too many requests. Please try again later.';
            errorType = 'RateLimitExceeded';
            break;

          case 'SHIELD':
            message = 'Request blocked by security rules.';
            errorType = 'ArcjetShield';
            break;
        }

        return response.status(status).json({
          timestamp: new Date().toISOString(),
          path: request.url,
          statusCode: status,
          error: errorType,
          message,
          ...(errorResponse.retryAfter && {
            retryAfter: errorResponse.retryAfter,
          }),
          ...(errorResponse.botType && { botType: errorResponse.botType }),
        });
      }
    }
    console.log(exception);
    // Handle all other exceptions
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json({
      timestamp: new Date().toISOString(),
      path: request.url,
      status,
      message,
    });
  }
}
