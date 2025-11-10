import { Injectable } from '@nestjs/common';
import { CreateEchoDto } from './dto/create-echo.dto';
import { UpdateEchoDto } from './dto/update-echo.dto';

@Injectable()
export class EchoService {
  create(createEchoDto: CreateEchoDto) {
    return 'This action adds a new echo';
  }

  findAll() {
    return `This action returns all echo`;
  }

  findOne(id: number) {
    return `This action returns a #${id} echo`;
  }

  update(id: number, updateEchoDto: UpdateEchoDto) {
    return `This action updates a #${id} echo`;
  }

  remove(id: number) {
    return `This action removes a #${id} echo`;
  }
}
