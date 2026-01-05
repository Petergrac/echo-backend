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
import { PostsService } from '../services/posts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePostDto } from '../dto/create-post.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../pipes/file-validation.pipe';
import type { Request } from 'express';
import { UpdatePostDto } from '../dto/update-post.dto';
import { FeedService } from '../services/feed.service';
import { Throttle } from '@nestjs/throttler';
import { PostResponseDto } from '../dto/post-response.dto';
import { ApiPaginatedResponse } from '../../../common/decorators/api-paginated-response.decorator';

@ApiTags('Posts')
@ApiBearerAuth('access_token')
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly feedService: FeedService,
  ) {}

  @ApiOperation({
    summary: 'Create a new post',
    description:
      'Create a post with optional text content and media attachments (up to 5 files)',
  })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    type: PostResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or media files',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Post content (max 200 characters)',
          example: 'Check out this amazing sunset!',
          maxLength: 200,
        },
        visibility: {
          type: 'string',
          enum: ['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'],
          description: 'Post visibility setting',
          example: 'PUBLIC',
        },
        media: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Media files to upload (images, videos, gifs) - max 5 files',
          maxItems: 5,
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('media', 5))
  @Post()
  async createPost(
    @Req() req: Request,
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
    @Body() body: CreatePostDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.postsService.createPost(
      userId,
      body,
      files,
      ip,
      userAgent,
    );
  }

  @ApiOperation({
    summary: 'Get post by ID',
    description:
      'Retrieve a specific post by its UUID. Includes engagement metrics and viewer context.',
  })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
    type: PostResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found or access denied',
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
  @Get(':id')
  async getPostById(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Req() req: Request,
  ) {
    const viewerId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.postsService.getPost(postId, viewerId, ip, userAgent);
  }

  @ApiOperation({
    summary: 'Update a post',
    description:
      'Update an existing post. Can update content, visibility, and media attachments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
    type: PostResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot edit others posts',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or media files',
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
          description: 'Updated post content (max 200 characters)',
          example: 'Updated post content',
          maxLength: 200,
        },
        visibility: {
          type: 'string',
          enum: ['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'],
          description: 'Updated post visibility',
          example: 'PUBLIC',
        },
        media: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Updated media files - max 5 files',
          maxItems: 5,
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('media', 5))
  @Patch(':id')
  async patchPost(
    @Body() dto: UpdatePostDto,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    console.log(userId);
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.postsService.updatePost(
      postId,
      userId,
      dto,
      files,
      ip,
      userAgent,
    );
  }

  @ApiOperation({
    summary: 'Delete a post',
    description: 'Delete a post. Only the post author can delete their post.',
  })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Post deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot delete others posts',
  })
  @ApiParam({
    name: 'id',
    description: 'Post UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async deletePost(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.postsService.deletePost(postId, userId, ip, userAgent);
  }

  @ApiOperation({
    summary: 'Get user posts',
    description: 'Retrieve paginated list of posts by a specific user',
  })
  @ApiPaginatedResponse(PostResponseDto)
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiParam({
    name: 'username',
    description: 'Username of the user',
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
  @Get('user/:username')
  async getUsersPost(
    @Param('username') username: string,
    @Req() req: Request,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.postsService.getUserPosts(
      username,
      page,
      limit,
      userId,
      ip,
      userAgent,
    );
  }

  @ApiOperation({
    summary: 'Get algorithmic feed (For You)',
    description:
      'Get personalized feed based on user interests, following, and engagement patterns',
  })
  @ApiPaginatedResponse(PostResponseDto)
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
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
  @Throttle({ default: { ttl: 6000, limit: 30 } })
  @Get('feed/for-you')
  async getAlgorithmicFeed(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.feedService.getAlgorithmicFeed(userId, page, limit);
  }

  @ApiOperation({
    summary: 'Get trending feed',
    description:
      'Get trending posts based on engagement within a specific timeframe',
  })
  @ApiPaginatedResponse(PostResponseDto)
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
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
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['day', 'week'],
    description: 'Time period for trending calculation (default: week)',
    example: 'week',
  })
  @Throttle({ default: { ttl: 6000, limit: 30 } })
  @Get('feed/trending')
  async getTrendingFeed(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('timeframe') timeframe: 'day' | 'week' = 'week',
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.feedService.getTrendingFeed(
      page,
      userId,
      limit,
      timeframe,
    );
  }

  @ApiOperation({
    summary: 'Get discover feed',
    description:
      "Discover new content from users you don't follow but might interest you",
  })
  @ApiPaginatedResponse(PostResponseDto)
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
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
  @Throttle({ default: { ttl: 6000, limit: 30 } })
  @Get('feed/discover')
  async getDiscoverFeed(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.feedService.getDiscoverFeed(userId, page, limit);
  }

  @ApiOperation({
    summary: 'Get following feed',
    description: 'Get posts from users you follow in chronological order',
  })
  @ApiPaginatedResponse(PostResponseDto)
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
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
  @Throttle({ default: { ttl: 6000, limit: 30 } })
  @Get('feed/following')
  async getFollowingFeed(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.feedService.getFollowingFeed(userId, page, limit);
  }
}
