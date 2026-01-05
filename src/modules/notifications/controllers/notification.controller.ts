import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationsService } from '../services/notifications.service';
import { NotificationResponseDto } from '../dto/response-notification.dto';
import { ApiPaginatedResponse } from '../../../common/decorators/api-paginated-response.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('access_token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  //TODO ==================== GET USER NOTIFICATIONS ====================
  @ApiOperation({
    summary: 'Get user notifications',
    description:
      'Retrieve paginated list of notifications for the authenticated user, ordered by creation date (newest first)',
  })
  @ApiPaginatedResponse(NotificationResponseDto)
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
  @Get()
  async getUserNotifications(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.notificationsService.getUserNotifications(
      userId,
      page,
      limit,
    );
  }

  //TODO ==================== GET UNREAD COUNT ====================
  @ApiOperation({
    summary: 'Get unread notification count',
    description:
      'Get the total count of unread notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of unread notifications',
          example: 15,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  //TODO ==================== MARK NOTIFICATION AS READ ====================
  @ApiOperation({
    summary: 'Mark notification as read',
    description:
      'Mark a specific notification as read. Only the recipient can mark their own notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot mark others notifications as read',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @HttpCode(HttpStatus.OK)
  @Patch(':id/read')
  async markAsRead(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) notificationId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.notificationsService.markAsRead(notificationId, userId);
  }

  //TODO ==================== MARK ALL AS READ ====================
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Mark all unread notifications for the authenticated user as read in a single operation',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        updatedCount: {
          type: 'number',
          description: 'Number of notifications marked as read',
          example: 15,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @HttpCode(HttpStatus.OK)
  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.notificationsService.markAllAsRead(userId);
  }

  //TODO ==================== DELETE NOTIFICATION ====================
  @ApiOperation({
    summary: 'Delete a notification',
    description:
      'Soft delete a specific notification. Only the recipient can delete their own notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Notification deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot delete others notifications',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async deleteNotification(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) notificationId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    await this.notificationsService.deleteNotification(notificationId, userId);
    return { message: 'Notification deleted successfully' };
  }

  //TODO ==================== DELETE ALL NOTIFICATIONS ====================
  @ApiOperation({
    summary: 'Delete all notifications',
    description:
      'Delete all notifications for the authenticated user. This action cannot be undone.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'All notifications have been deleted',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @HttpCode(HttpStatus.OK)
  @Delete('delete/delete-all')
  async deleteAllNotifications(@Req() req: Request) {
    try {
      const userId = (req.user as { userId: string }).userId;
      await this.notificationsService.deleteAll(userId);
      return { message: 'All notifications have been deleted' };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
