import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEchoDto {
  @IsOptional()
  @MaxLength(500,{message: 'Content can only be 500 characters and less'})
  @IsString({ message: 'Content must be a string' })
  content?: string | null;
}

export class MediaType {
  url: string;
  publicId: string;
  mimetype: string;
  resourceType: string;
}
