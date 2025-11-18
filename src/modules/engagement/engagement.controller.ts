import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { 
  CreateLikeDto, 
  CreateRippleDto, 
  CreateReEchoDto, 
  CreateBookmarkDto 
} from './dto/create-engagement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('engagement')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  /**
    * TODO ====================== LIKE AN ECHO ======================
    * @param createLikeDto 
    * @param req 
    * @returns //? Like an echo and trigger notifications
    */
  @Post('likes')
  async likeEcho(@Body() createLikeDto: CreateLikeDto, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.likeEcho(userId, createLikeDto);
  }

  /**
    * TODO ====================== UNLIKE AN ECHO ======================
    * @param echoId 
    * @param req 
    * @returns //? Remove like from an echo
    */
  @Delete('likes/:echoId')
  async unlikeEcho(@Param('echoId') echoId: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.unlikeEcho(userId, echoId);
  }

  /**
    * TODO ====================== CREATE A RIPPLE (COMMENT) ======================
    * @param createRippleDto 
    * @param req 
    * @returns //? Create a comment on an echo with optional parent for replies
    */
  @Post('ripples')
  async createRipple(@Body() createRippleDto: CreateRippleDto, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.createRipple(userId, createRippleDto);
  }

  /**
    * TODO ====================== UPDATE A RIPPLE ======================
    * @param rippleId 
    * @param content 
    * @param req 
    * @returns //? Update ripple content within 15-minute edit window
    */
  @Patch('ripples/:rippleId')
  async updateRipple(
    @Param('rippleId') rippleId: string,
    @Body('content') content: string,
    @Req() req: Request
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.updateRipple(rippleId, userId, content);
  }

  /**
    * TODO ====================== DELETE A RIPPLE ======================
    * @param rippleId 
    * @param req 
    * @returns //? Soft delete a ripple (author, echo author, or admin)
    */
  @Delete('ripples/:rippleId')
  async deleteRipple(@Param('rippleId') rippleId: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const userRole = (req.user as { role?: string }).role;
    return await this.engagementService.deleteRipple(rippleId, userId, userRole);
  }

  /**
    * TODO ====================== REECHO AN ECHO ======================
    * @param createReEchoDto 
    * @param req 
    * @returns //? Share an echo to your followers
    */
  @Post('reechoes')
  async reechoEcho(@Body() createReEchoDto: CreateReEchoDto, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.reechoEcho(userId, createReEchoDto);
  }

  /**
    * TODO ====================== UNREECHO AN ECHO ======================
    * @param echoId 
    * @param req 
    * @returns //? Remove reecho from an echo
    */
  @Delete('reechoes/:echoId')
  async unreechoEcho(@Param('echoId') echoId: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.unreechoEcho(userId, echoId);
  }

  /**
    * TODO ====================== BOOKMARK AN ECHO ======================
    * @param createBookmarkDto 
    * @param req 
    * @returns //? Bookmark an echo for later reading
    */
  @Post('bookmarks')
  async bookmarkEcho(@Body() createBookmarkDto: CreateBookmarkDto, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.bookmarkEcho(userId, createBookmarkDto);
  }

  /**
    * TODO ====================== UNBOOKMARK AN ECHO ======================
    * @param echoId 
    * @param req 
    * @returns //? Remove bookmark from an echo
    */
  @Delete('bookmarks/:echoId')
  async unbookmarkEcho(@Param('echoId') echoId: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.unbookmarkEcho(userId, echoId);
  }

  /**
    * TODO ====================== GET ECHO LIKES ======================
    * @param echoId 
    * @param page 
    * @param limit 
    * @returns //? Paginated list of users who liked an echo
    */
  @Get('echoes/:echoId/likes')
  async getEchoLikes(
    @Param('echoId') echoId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.engagementService.getEchoLikes(echoId, page, limit);
  }

  /**
    * TODO ====================== GET ECHO RIPPLES ======================
    * @param echoId 
    * @param page 
    * @param limit 
    * @returns //? Paginated list of comments on an echo
    */
  @Get('echoes/:echoId/ripples')
  async getEchoRipples(
    @Param('echoId') echoId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.engagementService.getEchoRipples(echoId, page, limit);
  }

  /**
    * TODO ====================== GET RIPPLE THREAD ======================
    * @param rippleId 
    * @returns //? Get a ripple with all its replies (thread view)
    */
  @Get('ripples/:rippleId/thread')
  async getRippleThread(@Param('rippleId') rippleId: string) {
    return await this.engagementService.getRippleThread(rippleId);
  }

  /**
    * TODO ====================== GET USER LIKES ======================
    * @param req 
    * @param page 
    * @param limit 
    * @returns //? Paginated list of echoes liked by the current user
    */
  @Get('users/me/likes')
  async getUserLikes(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.getUserLikes(userId, page, limit);
  }

  /**
    * TODO ====================== GET USER BOOKMARKS ======================
    * @param req 
    * @param page 
    * @param limit 
    * @returns //? Paginated list of bookmarked echoes
    */
  @Get('users/me/bookmarks')
  async getUserBookmarks(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.getUserBookmarks(userId, page, limit);
  }

  /**
    * TODO ====================== GET ENGAGEMENT COUNTS ======================
    * @param echoId 
    * @returns //? All engagement counts for a specific echo
    */
  @Get('echoes/:echoId/counts')
  async getEngagementCounts(@Param('echoId') echoId: string) {
    return await this.engagementService.getEngagementCounts(echoId);
  }

  /**
    * TODO ====================== GET USER ENGAGEMENT STATE ======================
    * @param echoId 
    * @param req 
    * @returns //? Current user's engagement state for a specific echo
    */
  @Get('echoes/:echoId/user-state')
  async getUserEngagementState(@Param('echoId') echoId: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.getUserEngagementState(userId, echoId);
  }
}