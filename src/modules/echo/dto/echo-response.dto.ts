import { ApiProperty } from '@nestjs/swagger';

export class MediaResponseDto {
  @ApiProperty({ example: 'cmi1k6cw40004ywobay8w23fp' })
  id: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../image.jpg' })
  url: string;

  @ApiProperty({ example: 'echos/user123/image_abc123' })
  publicId: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimetype: string;

  @ApiProperty({ example: false })
  sensitivity: boolean;

  @ApiProperty({ example: 1024000 })
  size: number;

  @ApiProperty({ example: '2023-11-16T10:15:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 'image' })
  resourceType: string;
}

export class AuthorSummaryDto {
  @ApiProperty({ example: 'user123' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'john' })
  firstName: string;

  @ApiProperty({ example: 'doe' })
  lastName: string;

  @ApiProperty({ 
    example: 'https://res.cloudinary.com/.../avatar.jpg',
    required: false 
  })
  avatar?: string;
}

export class EchoCountsDto {
  @ApiProperty({ example: 5 })
  likes: number;

  @ApiProperty({ example: 3 })
  ripples: number;

  @ApiProperty({ example: 2 })
  reechoes: number;

  constructor() {
    this.likes = 0;
    this.ripples = 0;
    this.reechoes = 0;
  }
}

export class EchoResponseDto {
  @ApiProperty({ example: 'cmi1k6cw40004ywobay8w23fp' })
  id: string;

  @ApiProperty({ 
    example: 'This is my awesome echo!',
    required: false 
  })
  content?: string;

  @ApiProperty({ type: [MediaResponseDto] })
  media: MediaResponseDto[];

  @ApiProperty()
  author: AuthorSummaryDto;

  @ApiProperty()
  counts: EchoCountsDto;

  @ApiProperty({ example: '2023-11-16T10:15:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-11-16T10:15:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: false })
  deleted: boolean;

  //? Static method to create from Prisma entity
  static fromEntity(echo: any): EchoResponseDto {
    const dto = new EchoResponseDto();
    dto.id = echo.id;
    dto.content = echo.content;
    dto.createdAt = echo.createdAt;
    dto.updatedAt = echo.updatedAt;
    dto.deleted = echo.deleted;
    
    //? Transform media
    dto.media = echo.media?.map(media => {
      const mediaDto = new MediaResponseDto();
      mediaDto.id = media.id;
      mediaDto.url = media.url;
      mediaDto.publicId = media.publicId;
      mediaDto.mimetype = media.mimetype;
      mediaDto.sensitivity = media.sensitivity;
      mediaDto.resourceType = media.resourceType;
      mediaDto.size = media.size;
      mediaDto.createdAt = media.createdAt;
      return mediaDto;
    }) || [];

    //? Transform author
    if (echo.author) {
      dto.author = new AuthorSummaryDto();
      dto.author.id = echo.author.id;
      dto.author.username = echo.author.username;
      dto.author.firstName = echo.author.firstName;
      dto.author.lastName = echo.author.lastName;
      dto.author.avatar = echo.author.avatar;
    }
    dto.counts = new EchoCountsDto();
    return dto;
  }
}