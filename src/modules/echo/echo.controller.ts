import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEchoDto } from './dto/create-echo.dto';
import { Request } from 'express';
import { EchoService } from './echo.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from './pipes/file-validation.pipe';
@Controller('echo')
@UseGuards(JwtAuthGuard)
export class EchoController {
  constructor(private readonly echoService: EchoService) {}

  /**
   * TODO ================== CREATE ECHO ===================
   * @param files
   * @param dto
   * @param req
   * @returns
   */
  @Post()
  @UseInterceptors(FilesInterceptor('mediaFiles', 5))
  async createEcho(
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
    @Body() dto: CreateEchoDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    
    return await this.echoService.createEcho({
      userId,
      dto,
      files,
      ip,
      userAgent,
    });
  }

  /**
   * TODO ================ GET ECHO BY ID ====================
   * @param id
   * @returns
   */
  @Get(':id')
  async getEchoById(@Param('id') id: string) {
    return this.echoService.getEchoById(id);
  }
  /**
   * TODO ================== SOFT DELETE ECHO =================
   * @param id
   * @param req
   * @returns
   */
  @Delete(':id')
  async softDeleteEcho(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');

    return await this.echoService.softDeleteEcho(userId, id, ip, userAgent);
  }
}
