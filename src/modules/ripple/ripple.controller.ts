import { Controller } from '@nestjs/common';
import { RippleService } from './ripple.service';

@Controller('ripple')
export class RippleController {
  constructor(private readonly rippleService: RippleService) {}
}
