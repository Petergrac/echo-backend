import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { EchoService } from './echo.service';
import { CreateEchoDto } from './dto/create-echo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { UpdateEchoDto } from './dto/update-echo.dto';

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
    return await this.echoService.createEcho(userId, dto, files, ip, userAgent);
  }

  /**
   * TODO ============================ GET ECHO BY ID ============================
   * @param id
   * @returns
   */
  @Get(':id')
  async getEcho(@Param('id') id: string) {
    return await this.echoService.getEchoById(id);
  }

  /**
   * TODO ============================ UPDATE ECHO ============================
   * @param id
   * @param dto
   * @param req
   * @returns
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateEcho(
    @Param('id') id: string,
    @Body() dto: UpdateEchoDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const userRole = (req.user as { role?: string }).role;
    return await this.echoService.updateEcho(userId, id, dto, userRole);
  }

  /**
   * TODO ============================ DELETE ECHO ============================
   * @param id
   * @param req
   * @returns
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteEcho(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const userRole = (req.user as { role?: string }).role;
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    return await this.echoService.deleteEcho(
      userId,
      id,
      userRole,
      ip,
      userAgent,
    );
  }

  @Get('users/:userId/echoes')
  async getUserEchoes(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const skip = (page - 1) * limit;
    // You'll need to add this method to your service
    return await this.echoService.getUserEchoes(userId, skip, limit);
  }
}
