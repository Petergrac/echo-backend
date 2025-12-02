import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

interface AdminFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin' | 'moderator' | 'banned';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  //TODO ==================== SYSTEM DASHBOARD ====================
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getSystemMetrics();
  }

  @Get('stats/daily')
  async getDailyStats(@Query('days') days: number = 7) {
    return this.adminService.getDailyStats(days);
  }

  //TODO ==================== USER MANAGEMENT ====================
  @Get('users')
  async getAllUsers(@Query() filters: AdminFilters) {
    const processedFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };
    return this.adminService.getAllUsers(processedFilters);
  }

  @Get('users/:id')
  async getUserDetails(@Param('id', new ParseUUIDPipe()) userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Post('users/:id/ban')
  async banUser(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body('reason') reason?: string,
  ) {
    const adminId = (req.user as { userId: string }).userId;
    return this.adminService.banUser(userId, adminId, reason);
  }

  @Post('users/:id/unban')
  async unbanUser(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) userId: string,
  ) {
    const adminId = (req.user as { userId: string }).userId;
    return this.adminService.unbanUser(userId, adminId);
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body('role') role: 'admin' | 'moderator' | 'user',
  ) {
    const adminId = (req.user as { userId: string }).userId;
    return this.adminService.updateUserRole(userId, role, adminId);
  }

  //TODO ==================== POST MANAGEMENT ====================
  @Get('posts')
  async getAllPosts(@Query() filters: AdminFilters) {
    const processedFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };
    return this.adminService.getAllPosts(processedFilters);
  }

  @Get('posts/:id')
  async getPostDetails(@Param('id', new ParseUUIDPipe()) postId: string) {
    return this.adminService.getPostDetails(postId);
  }

  @Delete('posts/:id')
  async deletePost(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Body('reason') reason?: string,
  ) {
    const adminId = (req.user as { userId: string }).userId;
    return this.adminService.deletePostAsAdmin(postId, adminId, reason);
  }

  @Post('posts/:id/restore')
  async restorePost(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    const adminId = (req.user as { userId: string }).userId;
    return this.adminService.restorePost(postId, adminId);
  }

  //TODO ==================== AUDIT LOGS ====================
  @Get('audit-logs')
  async getAuditLogs(@Query() filters: AdminFilters) {
    const processedFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };
    return this.adminService.getAuditLogs(processedFilters);
  }

  //TODO ==================== SYSTEM HEALTH ====================
  @Get('health')
  getSystemHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected',
    };
  }
}
