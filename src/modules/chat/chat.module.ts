import { Module } from '@nestjs/common';
import { ChatService } from './services/chat.service';
import { ChatController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { MessageReadReceipt } from './entities/message-read-receipt.entity';
import { User } from '../auth/entities/user.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      Message,
      MessageReaction,
      MessageReadReceipt,
      User,
    ]),
    CloudinaryModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
