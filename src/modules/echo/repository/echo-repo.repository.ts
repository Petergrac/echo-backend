import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { CreateEchoDto } from '../dto/create-echo.dto';

export interface MediaDataType {
  url: string;
  mimetype: string;
  sensitivity: boolean;
  publicId: string;
  size: number;
}

@Injectable()
export class EchoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createEcho(
    userId: string,
    data: CreateEchoDto,
    mediaData?: MediaDataType[],
  ) {
    const echo = await this.prisma.echo.create({
      data: {
        content: data.content,
        authorId: userId,
        media: {
          create: mediaData,
        },
      },
      include: { media: true },
    });
    return echo;
  }
}
