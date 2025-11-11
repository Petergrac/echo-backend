import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //TODO => GET YOUR PROFILE
  @UseGuards(JwtAuthGuard)
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

  @Patch('me')
  updateTheProfile(@Req() req: Request,@Body() ){

  }
}
