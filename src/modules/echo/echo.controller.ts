import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { EchoService } from './echo.service';
import { CreateEchoDto } from './dto/create-echo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from './pipes/file-validation.pipe';

@Controller('echo')
@UseGuards(JwtAuthGuard)
export class EchoController {
  constructor(private readonly echoService: EchoService) {}
  /**
   * TODO ================ CREATE AN ECHO WITH FILE UPLOADS =============
   * @param dto
   * @param req
   * @param files
   * @returns
   */
  @Post()
  @UseInterceptors(FilesInterceptor('media', 5))
  async createEcho(
    @Body() dto: CreateEchoDto,
    @Req() req: Request,
    @UploadedFiles(FileValidationPipe) files: Express.Multer.File[],
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    console.log(files[0].size);
    console.log(dto.content);
    return await this.echoService.createEcho(userId, dto, files,ip,userAgent);
  }


}
