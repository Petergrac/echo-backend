import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EngagementService } from '../services/engagement.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { CreateReplyDto } from '../dto/create-reply.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../pipes/file-validation.pipe';
import { CreateRepostDto } from '../dto/create-repost.dto';

@Controller('engagement')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}
  /**
   * TODO  <<<<<<<<<<<<<<<<<< LIKES ENDPOINTS >>>>>>>>>>>>>>>>>>>>>>
   * @param postId
   * @param req
   * @returns
   */
  //TODO =============== TOGGLE LIKES ON A POST ===============
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
  //TODO ================ GET ALL USERS WHO LIKED THIS POST ===============
  @Get('posts/:id/likes')
  async getPostLikes(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.engagementService.getPostLikes(postId, page, limit);
  }
  // TODO = ============ GET ALL POSTS THAT BELONG TO ME BUT HAVE LIKES =====
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
   *
   *todo<<<<<<<<<<<<<<<<<< BOOKMARKS ENDPOINTS >>>>>>>>>>>>>>>>>>>>>>
   */
  // TODO ============ TOGGLE BOOKMARK ========
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
  //TODO =============== GET ALL MY BOOKMARKED POSTS ==========
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
   *
   * TODO       <<<<<<<<<<<<<<<<<< REPLY ENDPOINTS >>>>>>>>>>>>>>>>>>>>>>
   * *========                                                  ================>
   *
   */
  //TODO ================ CREATE A REPLY ================
  @Post('posts/:id/reply')
  @UseInterceptors(FilesInterceptor('media', 3))
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

  //TODO =================== GET REPLIES OF A GIVEN POST
  @Get('posts/:id/replies')
  async getPostReplies(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.engagementService.getPostReplies(postId, page, limit);
  }
  // TODO ========== GET THE DIRECT CHILDREN OF A GIVEN REPLY =============
  @Get('replies/:id/replies')
  async getChildReplies(
    @Param('id', new ParseUUIDPipe()) replyId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.engagementService.getReplyReplies(replyId, page, limit);
  }
  //TODO ================== SOFT DELETE A REPLY ===================
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
   *
   * TODO       <<<<<<<<<<<<<<<<<< REPOST ENDPOINTS >>>>>>>>>>>>>>>>>>>>>>
   * *========                                                  ================>
   *
   */
  //TODO ================== TOGGLE REPOST ====================
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
  //TODO ================= GET REPOSTS OF A GIVEN POST ============
  @Get('posts/:id/reposts')
  async getPostReposts(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return await this.engagementService.getPostReposts(postId, page, limit);
  }
  //TODO ============== ORIGINAL POSTS WHICH I HAVE  REPOSTED ========
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
