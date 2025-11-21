import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'cmi50kcoa000rywmpz7i0cuzd' })
  id: string;

  @ApiProperty({ example: 'estella.gerhold27' })
  username: string;

  @ApiProperty({ example: 'Estella' })
  firstName: string;

  @ApiProperty({ example: 'Gerhold' })
  lastName: string;

  @ApiProperty({ example: 'Estella_Gerhold79@hotmail.com' })
  email: string;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 5 })
  limit: number;

  @ApiProperty({ example: 9 })
  total: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}