import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArcjetModule, detectBot, fixedWindow, shield } from '@arcjet/nest';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EchoModule } from './modules/echo/echo.module';
import { HealthController } from './common/controllers/healthcare.controller';
import { CustomArcjetGuard } from './common/guards/arcjet.guard';
import { CommonModule } from './common/module/common.module';
import { FeedModule } from './modules/feed/feed.module';
import { HashtagModule } from './modules/hashtag/hashtag.module';

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
          max: 5, // Allow a maximum of 2 requests
        }),
      ],
    }),
    CommonModule,
    AuthModule,
    UsersModule,
    EchoModule,
    FeedModule,
    HashtagModule,
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
