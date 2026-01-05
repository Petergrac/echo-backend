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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import {
  MuteKeywordDto,
  MuteUserDto,
  UpdatePreferencesDto,
} from '../dto/update-preference.dto';
import { plainToInstance } from 'class-transformer';
import { NotificationPreferencesResponseDto } from '../dto/response-preferences.dto';

@ApiTags('Notifications')
@ApiBearerAuth('access_token')
@Controller('notifications/preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferenceService,
  ) {}

  //TODO ==================== GET USER PREFERENCES ====================
  @ApiOperation({
    summary: 'Get user notification preferences',
    description:
      'Retrieve all notification preferences and settings for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
    type: NotificationPreferencesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @Get()
  async getPreferences(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const preference = await this.preferencesService.getUserPreferences(userId);
    return plainToInstance(NotificationPreferencesResponseDto, preference, {
      excludeExtraneousValues: true,
    });
  }

  //TODO ==================== UPDATE PREFERENCES ====================
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Update one or multiple notification preference settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    type: NotificationPreferencesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiBody({ type: UpdatePreferencesDto })
  @Patch()
  async updatePreferences(
    @Req() req: Request,
    @Body() updateDto: UpdatePreferencesDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.preferencesService.updateUserPreferences(
      userId,
      updateDto,
    );
  }

  //TODO ==================== MUTE/UNMUTE USER ====================
  @ApiOperation({
    summary: 'Mute or unmute notifications from a user',
    description:
      'Mute or unmute notifications from a specific user. When muted, you will not receive any notifications from this user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User mute status updated successfully',
    type: NotificationPreferencesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID or operation',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiBody({ type: MuteUserDto })
  @HttpCode(HttpStatus.OK)
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
  @ApiOperation({
    summary: 'Mute or unmute notifications containing keywords',
    description:
      'Mute or unmute notifications that contain specific keywords in their content. Useful for filtering out unwanted content.',
  })
  @ApiResponse({
    status: 200,
    description: 'Keyword mute status updated successfully',
    type: NotificationPreferencesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid keyword or operation',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiBody({ type: MuteKeywordDto })
  @HttpCode(HttpStatus.OK)
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
  @ApiOperation({
    summary: 'Reset notification preferences to defaults',
    description:
      'Reset all notification preferences to their default values. This action cannot be undone.',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences reset to defaults successfully',
    type: NotificationPreferencesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @HttpCode(HttpStatus.OK)
  @Delete('reset')
  async resetToDefaults(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.preferencesService.resetToDefaults(userId);
  }

  //TODO ==================== CHECK NOTIFICATION PERMISSION ====================
  @ApiOperation({
    summary: 'Check if a notification type is allowed',
    description:
      'Check if a specific notification type would be allowed based on current preferences. Useful for debugging notification settings.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission check completed',
    schema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean', example: true },
        reason: {
          type: 'string',
          example: 'Notification type disabled',
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid notification type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiParam({
    name: 'type',
    description: 'Notification type to check',
    enum: ['LIKE', 'REPLY', 'REPOST', 'FOLLOW', 'MENTION', 'SYSTEM'],
    example: 'LIKE',
  })
  @Get('check-permission/:type')
  async checkPermission(@Req() req: Request, @Param('type') type: string) {
    const userId = (req.user as { userId: string }).userId;
    return this.preferencesService.isNotificationAllowed(userId, type);
  }
}
