import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
    console.log('Database connected successfully!');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    console.log('Database disconnected successfully!');
  }
}
