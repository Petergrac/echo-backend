import { Options } from 'pino-http';
import { IncomingMessage } from 'http';
import { ServerResponse } from 'http';

interface CustomError extends Error {
  type?: string;
  statusCode?: number;
  code?: string;
}

export const getLoggerConfig = (): Options => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

    //* Pretty logs only in development
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss.l',
            singleLine: false,
          },
        }
      : undefined,

    //* Redact sensitive information
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'res.headers["set-cookie"]',
        'password',
        'token',
        'refreshToken',
      ],
      remove: true,
    },

    //* Custom serializers
    serializers: {
      req: (req: IncomingMessage & { id?: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
        },
      }),
      res: (res: ServerResponse) => ({
        statusCode: res.statusCode,
      }),
      err: (err: CustomError) => ({
        type: err.type,
        message: err.message,
        stack: isProduction ? undefined : err.stack, //* Stack traces only in dev
      }),
    },

    //* Add correlation IDs
    genReqId: (req: IncomingMessage) => {
      return (
        (req.headers['x-request-id'] as string) ||
        (req.headers['x-correlation-id'] as string)
      );
    },
    //* Customize log output
    formatters: {
      level: (label) => ({ level: label }),
    },
  };
};
