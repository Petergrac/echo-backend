import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  /**
   * TODO ========= GET THE CURRENT USER ===============
   * @param req
   * @returns
   */
  @Get('me')
  getMe(@Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    const userId = (req.user as { userId: string }).userId;
    return this.usersService.getMe(userId, ip, userAgent);
  }
  /**
   * TODO ============== GET USER PROFILE USING USERNAME ==============
   * @param username
   * @param req
   * @returns
   */
  @Throttle({ default: { limit: 100, ttl: 60000 } }) //? 100 request per minute
  @Get(':username')
  async getUserProfile(
    @Param('username') username: string,
    @Req() req: Request,
  ) {
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.usersService.getUserProfile(username, ip, userAgent);
  }
  /**
   * TODO ================ UPDATE USER PROFILE ===========
   * @param req
   * @param dto
   * @param file
   * @returns
   */
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
  /**
   * ! =================== DELETE THE PROFILE ============
   * @param req
   * @returns
   */
  @Delete('me')
  @HttpCode(204)
  async deleteAccount(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.usersService.deleteAccount(userId, ip, userAgent);
  }
}
