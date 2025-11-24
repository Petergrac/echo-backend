import {
  Controller,
  Param,
  Post,
  Req,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  /**
   * TODO ========== TOGGLE FOLLOW ============
   */
  @Post(':username/follow')
  async toggleFollow(@Req() req: Request, @Param('username') username: string) {
    const currentUserId = (req.user as { userId: string }).userId;
    return this.followService.toggleFollow(
      currentUserId,
      username,
      req.ip,
      req.get('user-agent'),
    );
  }

  /**
   * TODO ========== GET FOLLOWERS OF A USER ============
   */
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @Get(':username/followers')
  async getUserFollowers(
    @Req() req: Request,
    @Param('username') username: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const currentUserId = (req.user as { userId: string }).userId;
    return this.followService.getUserFollowers(
      username,
      currentUserId,
      req.ip,
      req.get('user-agent'),
      page,
      limit,
    );
  }

  /**
   * TODO ========== GET WHO A USER FOLLOWS ============
   */
  @Throttle({ default: { limit: 100, ttl: 60000 } }) //? 100 request per minute
  @Get(':username/following')
  async getUserFollowing(
    @Req() req: Request,
    @Param('username') username: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const currentUserId = (req.user as { userId: string }).userId;
    return this.followService.getUserFollowing(
      username,
      currentUserId,
      page,
      limit,
    );
  }

  /**
   * TODO> ========== GET MY FOLLOWERS ============
   */
  @Throttle({ default: { limit: 100, ttl: 60000 } }) //? 100 request per minute
  @Get('current/me/followers')
  async getMyFollowers(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const currentUserId = (req.user as { userId: string }).userId;
    return this.followService.getUserFollowers(
      null,
      currentUserId,
      req.ip,
      req.get('user-agent'),
      page,
      limit,
    );
  }

  /**
   * TODO> ========== GET WHO I FOLLOW ============
   */
  @Throttle({ default: { limit: 100, ttl: 60000 } }) //? 100 request per minute
  @Get('current/me/following')
  async getMyFollowing(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const currentUserId = (req.user as { userId: string }).userId;
    return this.followService.getUserFollowing(
      null,
      currentUserId,
      page,
      limit,
    );
  }
}
