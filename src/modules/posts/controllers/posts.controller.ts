import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PostsService } from '../services/posts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePostDto } from '../dto/create-post.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../pipes/file-validation.pipe';
import type { Request } from 'express';
import { UpdatePostDto } from '../dto/update-post.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  //TODO ============ CREATE POST ===========
  @Post()
  @UseInterceptors(FilesInterceptor('media', 5))
  async createPost(
    @Req() req: Request,
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
    @Body() body: CreatePostDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.postsService.createPost(
      userId,
      body,
      files,
      ip,
      userAgent,
    );
  }
  //TODO ================== GET POST BY ID ======================
  @Get(':id')
  async getPostById(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Req() req: Request,
  ) {
    const viewerId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.postsService.getPost(postId, viewerId, ip, userAgent);
  }
  //TODO ==================== PATCH THE POST ====================
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('media', 5))
  async patchPost(
    @Body() dto: UpdatePostDto,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.postsService.updatePost(
      postId,
      userId,
      dto,
      files,
      ip,
      userAgent,
    );
  }
  //TODO =================== DELETE THE POST ===================
  @Delete(':id')
  async deletePost(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return this.postsService.deletePost(postId, userId, ip, userAgent);
  }
}
