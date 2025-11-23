import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

    //* 1.If it's already an HttpException with a structured response, let it through
    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();

      //* 2.For Arcjet errors, they're already formatted by the guard - just add timestamp/path
      if (typeof errorResponse === 'object' && errorResponse !== null) {
        return response.status(status).json({
          ...errorResponse,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }

      //* 3.For other HttpExceptions
      return response.status(status).json({
        timestamp: new Date().toISOString(),
        path: request.url,
        statusCode: status,
        message: errorResponse,
      });
    }

    //* 4.Handle unknown errors
    response.status(status).json({
      timestamp: new Date().toISOString(),
      path: request.url,
      statusCode: status,
      message: 'Internal server error',
    });
  }
}
