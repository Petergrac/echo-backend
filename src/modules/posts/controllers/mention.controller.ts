import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MentionService } from '../services/mention.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@ApiTags('Mentions')
@Controller('mentions')
@UseGuards(JwtAuthGuard)
export class MentionController {
  constructor(private readonly mentionService: MentionService) {}

  @ApiOperation({
    summary: 'Get user mentions',
    description:
      'Retrieve paginated list of posts and replies where the authenticated user was mentioned',
  })
  @ApiResponse({
    status: 200,
    description: 'Mentions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: { $ref: '#/components/schemas/PostResponseDto' },
        },
        replies: {
          type: 'array',
          items: { $ref: '#/components/schemas/ReplyResponseDto' },
        },
        pagination: {
          type: 'object',
          properties: {
            currentPage: { type: 'number', example: 1 },
            totalPages: { type: 'number', example: 5 },
            totalItems: { type: 'number', example: 100 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
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
  @Get('me')
  async getMyMentions(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.mentionService.getUserMentions(userId, page, limit);
  }

  @ApiOperation({
    summary: 'Get unread mention count',
    description:
      'Get the total count of unread mentions for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of unread mentions',
          example: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @Get('me/unread-count')
  async getUnreadMentionCount(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const count = await this.mentionService.getUnreadMentionCount(userId);
    return { count };
  }
}
