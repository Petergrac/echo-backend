import { IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddParticipantsDto {
  @ApiProperty({
    description: 'Array of user IDs to add to conversation',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
    ],
    minItems: 1,
    maxItems: 20,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  participantIds: string[];
}
