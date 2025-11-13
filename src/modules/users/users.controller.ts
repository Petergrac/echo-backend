import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //TODO => GET YOUR PROFILE
  @Get('me')
  getMe(@Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    const userId = (req.user as { userId: string }).userId;
    return this.usersService.getMe(userId, ip, userAgent);
  }
  //TODO => GET SOMEONE ELSE PROFILE
  @Get(':username')
  getUserDetails(@Param('username') username: string, @Req() req: Request) {
    if (username.trim().length === 0)
      throw new ForbiddenException('Username cannot be empty');
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.usersService.getSpecificUserDetails(username, ip, userAgent);
  }
  //TODO => UPDATE YOUR PROFILE
  @Patch('me')
  @UseInterceptors(FileInterceptor('avatar'))
  updateTheProfile(
    @Req() req: Request,
    @Body() dto: UpdateUserDto,
    @UploadedFile(FileValidationPipe)
    file?: Express.Multer.File,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.usersService.updateProfile(userId, dto, ip, userAgent, file);
  }

  //! ==> DELETE USER PROFILE -->
  @Delete('me')
  @HttpCode(204)
  async deleteAccount(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.usersService.deleteAccount(userId, ip, userAgent);
  }
}

/**
 *TODO ============ ADMIN ROUTES ====================
 *
 */
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('admin')
  @Get()
  async getAllUsers(
    @Query('q') search?: string,
    @Query('role') role?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return await this.usersService.getallUsers({ page, limit, search, role });
  }

  @Roles('admin')
  @Delete(':userId')
  async deleteUserByAdmin(
    @Param('userId') userId: string,
    @Req() req: Request,
  ) {
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    if ((req.user as { userId: string }).userId === userId) {
      throw new BadRequestException('Admins cannot delete their own account');
    }
    return await this.usersService.deleteAccount(
      userId,
      ip,
      userAgent,
      'ADMIN',
    );
  }
}
