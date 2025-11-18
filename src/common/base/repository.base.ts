import { PrismaService } from '../../common/services/prisma.service';

export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}

  protected async executeTransaction<T>(
    operations: (prisma: any) => Promise<T>,
    maxRetries = 5
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.prisma.$transaction(operations, {
          maxWait: 5000,
          timeout: 10000,
        });
      } catch (error) {
        console.log(error);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );
      }
    }
    throw new Error('Transaction failed after retries');
  }
}