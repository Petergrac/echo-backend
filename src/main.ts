import './instruments';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import pinoHttp, { Options } from 'pino-http';
import helmet from 'helmet';
import { IncomingMessage } from 'http';
import { AllExceptionsFilter } from './common/filters/custom-all-filter.filter';
import { ConsoleLogger, ValidationPipe, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';

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
    origin: `http://localhost:3001`,
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
      whitelist: true, // strips unknown fields
      forbidNonWhitelisted: true, // throws if extra fields exist
      transform: true, // transforms payloads into DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
