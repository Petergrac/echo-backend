import { Controller } from '@nestjs/common';
import { ChatService } from './services/chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}
}
