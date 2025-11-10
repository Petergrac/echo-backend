import { PartialType } from '@nestjs/mapped-types';
import { CreateEchoDto } from './create-echo.dto';

export class UpdateEchoDto extends PartialType(CreateEchoDto) {}
