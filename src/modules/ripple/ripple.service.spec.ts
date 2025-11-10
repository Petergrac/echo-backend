import { Test, TestingModule } from '@nestjs/testing';
import { RippleService } from './ripple.service';

describe('RippleService', () => {
  let service: RippleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RippleService],
    }).compile();

    service = module.get<RippleService>(RippleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
