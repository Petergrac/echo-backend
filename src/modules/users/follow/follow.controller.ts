import {
  Controller,
  Param,
  Post,
  Req,
  Get,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FollowService } from './follow.service';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ApiPaginatedResponse } from '../../../common/decorators/api-paginated-response.decorator';
import { UserResponseDto } from '../../auth/dto/user-response.dto';

@ApiTags('Follow')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @ApiOperation({
    summary: 'Follow or unfollow a user',
    description:
      'Toggle follow status for a user. If already following, will unfollow. Returns the updated follow status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Follow status toggled successfully',
    schema: {
      type: 'object',
      properties: {
        following: {
          type: 'boolean',
          description:
            'Current follow status (true = following, false = not following)',
          example: true,
        },
        action: {
          type: 'string',
          enum: ['followed', 'unfollowed'],
          description: 'Action performed',
          example: 'followed',
        },
        followerCount: {
          type: 'number',
          description: 'Updated follower count for the target user',
          example: 150,
        },
        followingCount: {
          type: 'number',
          description: 'Updated following count for the current user',
          example: 75,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot follow yourself',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiParam({
    name: 'username',
    description: 'Username of the user to follow/unfollow',
    example: 'john_doe',
  })
  @HttpCode(HttpStatus.OK)
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

  @ApiOperation({
    summary: 'Get user followers',
    description:
      'Retrieve paginated list of users who follow the specified user. Includes follow status for the authenticated user.',
  })
  @ApiPaginatedResponse(UserResponseDto)
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests (rate limited)',
  })
  @ApiParam({
    name: 'username',
    description: 'Username of the user whose followers to retrieve',
    example: 'john_doe',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
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

  @ApiOperation({
    summary: 'Get user following',
    description:
      'Retrieve paginated list of users followed by the specified user. Includes follow status for the authenticated user.',
  })
  @ApiPaginatedResponse(UserResponseDto)
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests (rate limited)',
  })
  @ApiParam({
    name: 'username',
    description: 'Username of the user whose following list to retrieve',
    example: 'john_doe',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
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
}
