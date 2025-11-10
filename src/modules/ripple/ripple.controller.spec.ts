import { Test, TestingModule } from '@nestjs/testing';
import { RippleController } from './ripple.controller';
import { RippleService } from './ripple.service';

describe('RippleController', () => {
  let controller: RippleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RippleController],
      providers: [RippleService],
    }).compile();

    controller = module.get<RippleController>(RippleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
