import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EngagementService } from '../services/engagement.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { CreateRippleDto } from '../dto/create.dto';

@Controller('engagement')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  //TODO =============== TOGGLE LIKE ===============
  @Post('like/:echoId')
  async toggleLike(@Param('echoId') echoId: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.toggleLike(userId, echoId);
  }
  // TODO ================== CREATE A RIPPLE ==================
  @Post('ripple/:echoId')
  async createRipple(
    @Param('echoId') echoId: string,
    @Body() dto: CreateRippleDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.createRipple(
      userId,
      echoId,
      dto.content,
      dto.parentId,
    );
  }
  // TODO ================ GET TOP LAYER RIPPLES OF AN ECHO ==============
  @Get('ripples/:echoId')
  async getReplies(
    @Param('echoId') echoId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return await this.engagementService.getEchoRipples(echoId, page, limit);
  }
  // TODO ========= ======== GET NESTED REPLIES OF A RIPPLE ==========
  @Get('ripples/replies/:echoId')
  async getRippleReplies(
    @Param('echoId') echoId: string,
    @Body() parentId: string,
  ) {
    return await this.engagementService.getChildrenRipples(echoId, parentId);
  }
  // TODO ================ UPDATE RIPPLE ================
  @Patch('ripple/:rippleId')
  async updateRipple(
    @Param('rippleId') rippleId: string,
    @Body() content: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.engagementService.updateRipple(userId, rippleId, content);
  }
  @Delete('ripple/:rippleId')
  async deleteRipple() {}
}
