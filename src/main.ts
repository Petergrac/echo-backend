import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import pinoHttp, { Options } from 'pino-http';
import helmet from 'helmet';
import { IncomingMessage } from 'http';
import { AllExceptionsFilter } from './common/filters/arcjet-custom.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * ==================  CONFIGURING HELMET =============
   */
  app.use(helmet());

  /**
   * ==================  CONFIGURING CORS =============
   */
  app.enableCors({
    origin: `http://localhost:${process.env.PORT}`,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  /**
   * ==================  PINO OPTIONS & MIDDLEWARE =============
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
   * ==================  Add global Exceptional filters =============
   */

  app.useGlobalFilters(new AllExceptionsFilter());

  /**
   * ==================  VALIDATION PIPE INITIALIZATION =============
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
