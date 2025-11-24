import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArcjetModule, detectBot, fixedWindow, shield } from '@arcjet/nest';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/module/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './common/controllers/healthcare.controller';
import { CustomArcjetGuard } from './common/guards/arcjet.guard';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: true,
      migrations: ['src/migrations/*.ts'],
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
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    PostsModule,
    UsersModule,
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
