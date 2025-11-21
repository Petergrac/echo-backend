import { Test, TestingModule } from '@nestjs/testing';
import { EchoController } from './echo.controller';
import { EchoService } from '../services/echo.service';

describe('EchoController', () => {
  let controller: EchoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EchoController],
      providers: [EchoService],
    }).compile();

    controller = module.get<EchoController>(EchoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
