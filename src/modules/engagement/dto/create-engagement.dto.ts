import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLikeDto {
  @ApiProperty({ description: 'Echo ID to like' })
  @IsString()
  @IsNotEmpty()
  echoId: string;
}

export class CreateRippleDto {
  @ApiProperty({ description: 'Echo ID to comment on' })
  @IsString()
  @IsNotEmpty()
  echoId: string;

  @ApiProperty({ description: 'Comment content', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: 'Ripple content must be less than 500 characters' })
  content: string;

  @ApiProperty({ description: 'Parent ripple ID for replies', required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateReEchoDto {
  @ApiProperty({ description: 'Echo ID to reecho' })
  @IsString()
  @IsNotEmpty()
  echoId: string;
}

export class CreateBookmarkDto {
  @ApiProperty({ description: 'Echo ID to bookmark' })
  @IsString()
  @IsNotEmpty()
  echoId: string;
}