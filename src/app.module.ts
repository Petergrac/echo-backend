import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ArcjetModule, detectBot, fixedWindow, shield } from '@arcjet/nest';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/module/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomArcjetGuard } from './common/guards/arcjet.guard';
import { UsersModule } from './modules/users/users.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import KeyvRedis from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Keyv } from 'keyv';
import { CacheableMemory } from 'cacheable';
import { ChatModule } from './modules/chat/chat.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'production',
      migrations: ['src/migrations/*.ts'],
      migrationsRun: process.env.NODE_ENV === 'production',
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
          window: '60s', //* 10 second fixed window
          max: 30, //* Allow a maximum of 7 requests
        }),
      ],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 6000,
          limit: 10,
        },
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        return {
          //* Using multiple stores
          stores: [
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            new KeyvRedis('redis://localhost:6379'),
          ],
        };
      },
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    PostsModule,
    UsersModule,
    ChatModule,
    SearchModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter, //? Must start before all other filters
    },
    {
      provide: APP_GUARD,
      useClass: CustomArcjetGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
