import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { UserResponseDto } from '../auth/dto/user-response.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieve detailed profile information of the authenticated user including follower counts, post counts, and engagement metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @Get('me')
  getMe(@Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    const userId = (req.user as { userId: string }).userId;
    return this.usersService.getMe(userId, ip, userAgent);
  }

  @ApiOperation({
    summary: 'Get user profile by username',
    description:
      'Retrieve public profile information of any user by their username. Includes following status for authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests (rate limited)',
  })
  @ApiParam({
    name: 'username',
    description: 'Username of the user to retrieve',
    example: 'john_doe',
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } }) //? 100 request per minute
  @Get(':username')
  async getUserProfile(
    @Param('username') username: string,
    @Req() req: Request,
  ) {
    const ip = req.ip;
    const userId = (req.user as { userId: string }).userId;
    const userAgent = req.get('user-agent');
    return await this.usersService.getUserProfile(
      username,
      userId,
      ip,
      userAgent,
    );
  }

  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update profile information of the authenticated user. Supports updating basic info and uploading avatar.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or no fields to update',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 413,
    description: 'File too large',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: 'First name',
          example: 'John',
        },
        lastName: {
          type: 'string',
          description: 'Last name',
          example: 'Doe',
        },
        email: {
          type: 'string',
          description:
            'Email address (will require re-verification if changed)',
          example: 'john.doe@example.com',
          format: 'email',
        },
        username: {
          type: 'string',
          description: 'Username (must be unique)',
          example: 'john_doe',
        },
        bio: {
          type: 'string',
          description: 'Short biography',
          example: 'Software developer passionate about open source',
        },
        location: {
          type: 'string',
          description: 'Location',
          example: 'San Francisco, CA',
        },
        website: {
          type: 'string',
          description: 'Website URL',
          example: 'https://john.doe.com',
          format: 'uri',
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (jpg, jpeg, png, gif)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  @Patch('me')
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

  @ApiOperation({
    summary: 'Delete user account',
    description: `Permanently delete the authenticated user's account. 
    
    **WARNING**: This action is irreversible and will:
    - Soft delete user profile
    - Remove avatar from storage
    - Revoke all authentication tokens
    - Preserve audit logs for compliance
    
    User data will be retained for 30 days before permanent deletion.`,
  })
  @ApiResponse({
    status: 204,
    description: 'Account deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  async deleteAccount(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.usersService.deleteAccount(userId, ip, userAgent);
  }
  @Get('active/all-users')
  async getAllUsers(
    @Req() req: Request,
    @Param('page') page: number = 1,
    @Param('limit') limit: number = 15,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.usersService.getAllUsers(
      userId,
      page,
      limit,
      ip,
      userAgent,
    );
  }
}
