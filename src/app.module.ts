import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArcjetModule, detectBot, fixedWindow, shield } from '@arcjet/nest';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EchoModule } from './modules/echo/echo.module';
import { RippleModule } from './modules/ripple/ripple.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthController } from './common/controllers/healthcare.controller';
import { CustomArcjetGuard } from './common/guards/arcjet.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!,
      rules: [
        shield({ mode: 'LIVE' }),
        detectBot({
          allow: [
            'CATEGORY:SEARCH_ENGINE', // Google, Bing, etc
            'CATEGORY:MONITOR', // Uptime monitoring services
            'CATEGORY:PREVIEW', // Link previews e.g. Slack, Discord
          ],
        }),
        fixedWindow({
          mode: 'LIVE',
          window: '60s', // 10 second fixed window
          max: 2, // Allow a maximum of 2 requests
        }),
      ],
    }),
    AuthModule,
    UsersModule,
    EchoModule,
    RippleModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: CustomArcjetGuard,
    },
  ],
})
export class AppModule {}
