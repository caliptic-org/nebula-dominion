import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { DmConversation } from './entities/dm-conversation.entity';
import { DmMessage } from './entities/dm-message.entity';
import { DmBlock } from './entities/dm-block.entity';
import { GuildMembership } from './entities/guild-membership.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { DmGateway } from './dm.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      DmConversation,
      DmMessage,
      DmBlock,
      GuildMembership,
    ]),
    AuthModule,
  ],
  providers: [ChatService, ChatGateway, DmGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
