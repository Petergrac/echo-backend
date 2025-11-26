import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../modules/auth/entities/user.entity';
import { Repository } from 'typeorm';
import { HashtagService } from '../../modules/posts/services/hashtag.service';

//TODO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< DELETE OLD ACCOUNTS FROM THE DATABASE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
@Injectable()
export class CleanupOldAccountsTask {
  private readonly logger = new Logger(CleanupOldAccountsTask.name);
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}
  //* Runs every day at 3:00 AM
  @Cron('0 3 * * *')
  async handleCron() {
    await this.permanentlyDeleteOldAccounts();
  }
  /**
   * TODO =========== PERMANENT DELETE OLD ACCOUNTS =======
   * @param days
   */
  async permanentlyDeleteOldAccounts(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    this.logger.log(
      `Permanently deleting accounts soft-deleted before ${cutoffDate.toISOString()}`,
    );
    //* Hard delete the user account( 30 days old)
    const result = await this.userRepo
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('deletedAt < :cutoff', { cutoff: cutoffDate })
      .execute();

    this.logger.log(`Permanently deleted ${result.affected} old accounts`);
  }
}

//TODO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< DELETE ORPHANED HASHTAGS >>>>>>>>>>>>>>>>>>
@Injectable()
export class DeleteOrphanedHashTagsTask {
  constructor(private readonly hashTagService: HashtagService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanUnusedTags() {
    await this.hashTagService.cleanupOrphanedHashtags();
  }
}
