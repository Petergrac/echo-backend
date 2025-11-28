import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import {
  MuteKeywordDto,
  MuteUserDto,
  UpdatePreferencesDto,
} from '../dto/update-preference.dto';
import { plainToInstance } from 'class-transformer';
import { NotificationPreferencesResponseDto } from '../dto/response-preferences.dto';

@Controller('notifications/preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferenceService,
  ) {}

  //TODO ==================== GET USER PREFERENCES ====================
  @Get()
  async getPreferences(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const preference = await this.preferencesService.getUserPreferences(userId);
    return plainToInstance(NotificationPreferencesResponseDto, preference, {
      excludeExtraneousValues: true,
    });
  }

  //TODO ==================== UPDATE PREFERENCES ====================
  @Patch()
  async updatePreferences(
    @Req() req: Request,
    @Body() updateDto: UpdatePreferencesDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    console.log(updateDto);
    return await this.preferencesService.updateUserPreferences(
      userId,
      updateDto,
    );
  }

  //TODO ==================== MUTE/UNMUTE USER ====================
  @Post('mute-user')
  async muteUser(@Req() req: Request, @Body() muteUserDto: MuteUserDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.preferencesService.toggleUserMute(
      userId,
      muteUserDto.userId,
      muteUserDto.mute,
    );
  }

  //TODO ==================== MUTE/UNMUTE KEYWORD ====================
  @Post('mute-keyword')
  async muteKeyword(
    @Req() req: Request,
    @Body() muteKeywordDto: MuteKeywordDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.preferencesService.toggleKeywordMute(
      userId,
      muteKeywordDto.keyword,
      muteKeywordDto.mute,
    );
  }

  //TODO ==================== RESET TO DEFAULTS ====================
  @Delete('reset')
  async resetToDefaults(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.preferencesService.resetToDefaults(userId);
  }

  //TODO ==================== CHECK NOTIFICATION PERMISSION ====================
  @Get('check-permission/:type')
  async checkPermission(@Req() req: Request, @Param('type') type: string) {
    const userId = (req.user as { userId: string }).userId;
    return this.preferencesService.isNotificationAllowed(userId, type);
  }
}
