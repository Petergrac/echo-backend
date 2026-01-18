import './instruments';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import pinoHttp, { Options } from 'pino-http';
import helmet from 'helmet';
import { IncomingMessage } from 'http';
import { AllExceptionsFilter } from './common/filters/custom-all-filter.filter';
import { ConsoleLogger, ValidationPipe, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { swaggerOptions } from './swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'ECHO-APP',
    }),
  });

  //* Application versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v1',
  });
  /**
   * TODO==================  CONFIGURING HELMET =============
   */
  app.use(helmet());
  app.use(cookieParser());
  /**
   * TODO==================  CONFIGURING CORS =============
   */
  app.enableCors({
    origin: [
      `${process.env.FRONTEND_URL}`,
      'http://localhost:3001',
      'http://10.40.28.54:3001',
      process.env.SENTRY_DNS ? 'https://sentry.io' : '',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  /**
   * TODO==================  PINO OPTIONS & MIDDLEWARE =============
   */
  const options: Options = {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname,req.headers,res.headers',
        translateTime: 'HH:MM:ss.l',
      },
    },
    serializers: {
      req: (req: IncomingMessage & { id?: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'] as string,
          authorization: req.headers['authorization'],
        },
      }),
    },
  };
  const loggerMiddleware = pinoHttp(options);
  app.use(loggerMiddleware);

  /**
   * TODO==================  Add global Exceptional filters =============
   */

  app.useGlobalFilters(new AllExceptionsFilter());

  /**
   * TODO==================  VALIDATION PIPE INITIALIZATION =============
   */

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //? strips unknown fields
      forbidNonWhitelisted: true, //? throws if extra fields exist
      transform: true, //? transforms payloads into DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  /**
   * TODO ============================ SETUP SWAGGER ===================
   */
  const config = new DocumentBuilder()
    .setTitle('Echo Social Media API')
    .setDescription(
      `# Echo Backend API Documentation

## Overview
Echo is a robust social media backend that can be wired to any frontend. It handles authentication, user management, posts, and social interactions.

## Authentication
This API uses **cookie-based authentication** with two tokens:
1. **Access Token** (15 minutes expiry) - Sent as HttpOnly cookie
2. **Refresh Token** (7 days expiry) - Sent as HttpOnly cookie

## Features
- JWT-based authentication with refresh tokens
- Email verification
- Password reset functionality
- Rate limiting on sensitive endpoints
- Comprehensive audit logging
- User profile management

## Getting Started
1. Register a new user at \`/auth/signup\`
2. Login at \`/auth/login\` to get authentication cookies
3. Use protected endpoints with automatic cookie sending

## Rate Limits
- Login: 3 attempts per 10 minutes
- Other endpoints may have specific rate limits

## Security
- All passwords are hashed with Argon2
- Email enumeration protection
- HttpOnly cookies for token storage
- CSRF protection via SameSite cookies
- Helmet.js security headers

## User Management Features

### Profile Management
- **Get Profile**: Retrieve current user profile or other users' profiles
- **Update Profile**: Update user information including avatar upload
- **Delete Account**: Schedule account deletion with 30-day retention

### Profile Features
- **Avatar Support**: Upload and manage profile pictures
- **Bio & Metadata**: Customize profile with biography, location, and website
- **Following System**: Track followers and following counts
- **Engagement Metrics**: View post counts and user activity

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against abuse
- **Audit Logging**: Track all user actions
- **Data Validation**: Comprehensive input validation

### File Upload Specifications
- **Avatar Images**: JPG, JPEG, PNG, GIF formats
- **Size Limit**: 5MB per file
- **Automatic Optimization**: Images are automatically optimized and resized
- **Cloud Storage**: Secure cloud storage with CDN delivery

### Follow System
- **Follow/Unfollow**: Toggle follow status for users
- **Follower Lists**: View who follows a user
- **Following Lists**: View who a user follows
- **Mutual Connections**: Discover shared connections

### Engagement Features
- **Real-time Updates**: Follow actions trigger notifications
- **Social Graph**: Build and explore user connections
- **Network Discovery**: Find new users through existing connections

### Rate Limits
- **Follow Actions**: Standard rate limits apply
- **List Views**: 100 requests per minute for follower/following lists

For more information, visit [GitHub Repository](https://github.com/Petergrac/echo-backend)
      `,
    )
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.echo-app.com', 'Production server')
    .addGlobalResponse({
      description: 'Internal Server Error',
      status: 500,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 500 },
              message: { type: 'string', example: 'Internal server error' },
              timestamp: {
                type: 'string',
                example: '2024-01-01T00:00:00.000Z',
              },
              path: { type: 'string', example: '/auth/login' },
            },
          },
        },
      },
    })
    .addGlobalResponse({
      description: 'Bad Request',
      status: 400,
    })
    .addGlobalResponse({
      description: 'Unauthorized',
      status: 401,
    })
    .addGlobalResponse({
      description: 'Forbidden',
      status: 403,
    })
    .addGlobalResponse({
      description: 'Not Found',
      status: 404,
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Generate OpenAPI spec file for external tools
  if (process.env.NODE_ENV === 'development') {
    writeFileSync(
      join(__dirname, '..', 'openapi-spec.json'),
      JSON.stringify(document, null, 2),
    );
  }

  SwaggerModule.setup('api', app, document, swaggerOptions);

  //todo ======= setup listener =========
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
