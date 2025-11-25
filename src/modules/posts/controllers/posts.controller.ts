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
} from '@nestjs/common';
import { PostsService } from '../services/posts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePostDto } from '../dto/create-post.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../pipes/file-validation.pipe';
import type { Request } from 'express';
import { UpdatePostDto } from '../dto/update-post.dto';
import { FeedService } from '../services/feed.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly feedService: FeedService,
  ) {}

  //TODO ============ CREATE POST ===========
  @Post()
  @UseInterceptors(FilesInterceptor('media', 5))
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
  //TODO ================== GET POST BY ID ======================
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
  //TODO ==================== PATCH THE POST ====================
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('media', 5))
  async patchPost(
    @Body() dto: UpdatePostDto,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
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
  //TODO =================== DELETE THE POST ===================
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

  //TODO <<<<<<<<<<<<<<<<<<<<<<<<<<< USER POSTS  >>>>>>>>>>>>>>>>>>>>
  //TODO ==========> GET SPECIFIC USERS POSTS ===============
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
  /**
   * TODO <<<<<<<<<<<<<<<<< FEED  >>>>>>>>>>>>>>>>>>>>
   * @param req
   * @param page
   * @param limit
   * @returns
   */
  //TODO ============== GET HOME FEED ===================
  @Get('feed/me')
  async getMyHomeFeed(
    @Req() req: Request,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.postsService.getFeed(userId, page, limit);
  }
  //TODO ==================== ALGORITHMIC FEED ====================
  @Get('feed/algorithmic')
  async getAlgorithmicFeed(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.feedService.getAlgorithmicFeed(userId, page, limit);
  }

  //TODO ==================== TRENDING FEED ====================
  @Get('feed/trending')
  async getTrendingFeed(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('timeframe') timeframe: 'day' | 'week' = 'day',
  ) {
    return await this.feedService.getTrendingFeed(page, limit, timeframe);
  }
  //TODO ==================== DISCOVER FEED ====================
  @Get('feed/discover')
  async getDiscoverFeed(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.feedService.getDiscoverFeed(userId, page, limit);
  }
}
