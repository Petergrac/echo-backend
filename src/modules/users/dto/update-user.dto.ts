import { PartialType, OmitType } from '@nestjs/mapped-types';
import { UserEntity } from '../entities/user.entity';

export class UpdateUserDto extends PartialType(
  OmitType(UserEntity, ['id', 'email', 'createdAt', 'updatedAt'] as const),
) {}
