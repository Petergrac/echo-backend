import { IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class AddParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  participantIds: string[];
}
