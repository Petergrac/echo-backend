import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { EngagementService } from '../services/engagement.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { CreateReplyDto, UpdateReplyDto } from '../dto/create-reply.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../pipes/file-validation.pipe';
import { CreateRepostDto } from '../dto/create-repost.dto';
import { PostResponseDto } from '../dto/post-response.dto';
import { ReplyResponseDto } from '../dto/reply-response.dto';
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { ApiPaginatedResponse } from '../../../common/decorators/api-paginated-response.decorator';

@ApiTags('Engagement')
@ApiBearerAuth('access_token')
@Controller('engagement')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  /**
   * TODO  <<<<<<<<<<<<<<<<<< LIKES ENDPOINTS >>>>>>>>>>>>>>>>>>>>>>
   */

  @ApiOperation({
    summary: 'Like or unlike a post',
    description:
      'Toggle like status for a post. If already liked, it will be unliked.',
  })
  @ApiResponse({
    status: 200,
    description: 'Like toggled successfully',
    schema: {
      type: 'object',
      properties: {
        liked: { type: 'boolean', example: true },
        likesCount: { type: 'number', example: 15 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiParam({
    name: 'id',
    description: 'Post UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @HttpCode(HttpStatus.OK)
  @Post('posts/:id/like')
  async toggleLike(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.engagementService.toggleLike(postId, userId, ip, userAgent);
  }

  @ApiOperation({
    summary: 'Get users who liked a post',
    description: 'Retrieve paginated list of users who liked a specific post',
  })
  @ApiPaginatedResponse(UserResponseDto)
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Post UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
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
  @Get('posts/:id/likes')
  async getPostLikes(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.engagementService.getPostLikes(postId, page, limit);
  }

  @ApiOperation({
    summary: 'Get posts liked by authenticated user',
    description:
      'Retrieve paginated list of posts that the authenticated user has liked',
  })
  @ApiPaginatedResponse(PostResponseDto)
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
  @Get('me/likes')
  async getAllMyLikedPosts(
    @Req() req: Request,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.engagementService.getUserLikedPosts(userId, page, limit);
  }

  /**
   * TODO <<<<<<<<<<<<<<<<<< BOOKMARKS ENDPOINTS >>>>>>>>>>>>>>>>>>>>>>
   */

  @ApiOperation({
    summary: 'Bookmark or unbookmark a post',
    description:
      'Toggle bookmark status for a post. If already bookmarked, it will be removed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookmark toggled successfully',
    schema: {
      type: 'object',
      properties: {
        bookmarked: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiParam({
    name: 'id',
    description: 'Post UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @HttpCode(HttpStatus.OK)
  @Post('posts/:id/bookmark')
  async toggleBookmark(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.engagementService.toggleBookmark(
      postId,
      userId,
      ip,
      userAgent,
    );
  }

  @ApiOperation({
    summary: 'Get bookmarked posts',
    description:
      'Retrieve paginated list of posts bookmarked by the authenticated user',
  })
  @ApiPaginatedResponse(PostResponseDto)
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
  @Get('me/bookmarks')
  async getMyBookmarkedPosts(
    @Req() req: Request,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.getUserBookmarks(userId, page, limit);
  }

  /**
   * TODO <<<<<<<<<<<<<<<<<< REPLY ENDPOINTS >>>>>>>>>>>>>>>>>>>>>>
   */

  @ApiOperation({
    summary: 'Create a reply to a post',
    description:
      'Create a reply to a post. Supports text content and optional media upload.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reply created successfully',
    type: ReplyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or media file',
  })
  @ApiParam({
    name: 'id',
    description: 'Post UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Reply content (max 280 characters)',
          example: 'Great post!',
          maxLength: 280,
        },
        parentReplyId: {
          type: 'string',
          description: 'Parent reply ID if replying to another reply',
          example: '123e4567-e89b-12d3-a456-426614174001',
        },
        media: {
          type: 'string',
          format: 'binary',
          description: 'Media file to upload (image, video, gif)',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('media', 1))
  @Post('posts/:id/reply')
  async createReply(
    @Req()
    req: Request,
    @Body() dto: CreateReplyDto,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.engagementService.createReply(
      postId,
      userId,
      dto,
      files,
      ip,
      userAgent,
    );
  }

  @ApiOperation({
    summary: 'Update a reply',
    description: 'Update an existing reply. Can update content and/or media.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reply updated successfully',
    type: ReplyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post or reply not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot edit others replies',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or media file',
  })
  @ApiParam({
    name: 'id',
    description: 'Post UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'replyId',
    description: 'Reply UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Updated reply content (max 280 characters)',
          example: 'Updated reply text',
          maxLength: 280,
        },
        parentReplyId: {
          type: 'string',
          description: 'Parent reply ID if replying to another reply',
          example: '123e4567-e89b-12d3-a456-426614174002',
        },
        media: {
          type: 'string',
          format: 'binary',
          description: 'Media file to upload (image, video, gif)',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('media', 1))
  @Patch('posts/:id/:replyId')
  async patchReply(
    @Req()
    req: Request,
    @Body() dto: UpdateReplyDto,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Param('replyId', new ParseUUIDPipe()) replyId: string,
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.engagementService.patchReply(
      postId,
      userId,
      dto,
      replyId,
      files,
      ip,
      userAgent,
    );
  }

  @ApiOperation({
    summary: 'Get post replies',
    description: 'Retrieve paginated list of replies for a specific post',
  })
  @ApiPaginatedResponse(ReplyResponseDto)
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Post UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
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
  @Get('posts/:id/replies')
  async getPostReplies(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.engagementService.getPostReplies(postId, page, limit);
  }

  @ApiOperation({
    summary: 'Get child replies',
    description:
      'Retrieve paginated list of replies to a specific reply (nested replies)',
  })
  @ApiPaginatedResponse(ReplyResponseDto)
  @ApiResponse({
    status: 404,
    description: 'Reply not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Reply UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
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
  @Get('replies/:id/replies')
  async getChildReplies(
    @Param('id', new ParseUUIDPipe()) replyId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.engagementService.getReplyReplies(replyId, page, limit);
  }

  @ApiOperation({
    summary: 'Delete a reply',
    description:
      'Soft delete a reply. Only the reply author can delete their reply.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reply deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Reply deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Reply not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot delete others replies',
  })
  @ApiParam({
    name: 'id',
    description: 'Reply UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @HttpCode(HttpStatus.OK)
  @Delete('replies/:id')
  async deleteReply(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) replyId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.engagementService.deleteReply(replyId, userId, ip, userAgent);
  }

  /**
   * TODO <<<<<<<<<<<<<<<<<< REPOST ENDPOINTS >>>>>>>>>>>>>>>>>>>>>>
   */

  @ApiOperation({
    summary: 'Repost a post',
    description:
      'Create a repost (share) of a post. Can include additional commentary.',
  })
  @ApiResponse({
    status: 201,
    description: 'Repost created successfully',
    type: PostResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot repost your own post or invalid input',
  })
  @ApiParam({
    name: 'id',
    description: 'Post UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: CreateRepostDto })
  @HttpCode(HttpStatus.CREATED)
  @Post('posts/:id/repost')
  async toggleRepost(
    @Req() req: Request,
    @Body() dto: CreateRepostDto,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.engagementService.createRepost(
      postId,
      userId,
      dto,
      ip,
      userAgent,
    );
  }

  @ApiOperation({
    summary: 'Get post reposts',
    description: 'Retrieve paginated list of reposts for a specific post',
  })
  @ApiPaginatedResponse(PostResponseDto)
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Post UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
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
  @Get('posts/:id/reposts')
  async getPostReposts(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return await this.engagementService.getPostReposts(postId, page, limit);
  }

  @ApiOperation({
    summary: 'Get user reposts',
    description:
      'Retrieve paginated list of posts reposted by the authenticated user',
  })
  @ApiPaginatedResponse(PostResponseDto)
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
  @Get('me/reposts')
  async getUserReposts(
    @Req() req: Request,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.getUserReposts(userId, page, limit);
  }
}
