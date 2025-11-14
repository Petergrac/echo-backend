import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FollowService } from './follow.service';
import { Request } from 'express';

@Controller('users/:id')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Get('followers')
  async getFollowers(
    @Param('id') id: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return await this.followService.getFollowers(id, page, limit);
  }

  @Get('followings')
  async getFollowing(
    @Param('id') id: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return await this.followService.getFollowing(id, page, limit);
  }

  @Post('follow')
  async followUser(@Param('id') followerId: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;

    return await this.followService.toggleFollow(followerId, userId);
  }

  @Delete('unfollow')
  async unfollowUser(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;

    return await this.followService.unfollowUser(id, userId);
  }
}
