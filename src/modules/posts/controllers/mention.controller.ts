import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { MentionService } from '../services/mention.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('mentions')
@UseGuards(JwtAuthGuard)
export class MentionController {
  constructor(private readonly mentionService: MentionService) {}

  //TODO ==================== GET USER MENTIONS ====================
  @Get('me')
  async getMyMentions(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.mentionService.getUserMentions(userId, page, limit);
  }

  //TODO ==================== GET UNREAD MENTION COUNT ====================
  @Get('me/unread-count')
  async getUnreadMentionCount(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const count = await this.mentionService.getUnreadMentionCount(userId);
    return { count };
  }
}
