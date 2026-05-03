import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AllianceController } from './alliance.controller';
import { AllianceService } from './alliance.service';
import { AlliancePlayerController } from './alliance-player.controller';
import { AlliancePlayerService } from './alliance-player.service';
import { AllianceChatGateway } from './alliance-chat.gateway';
import { Alliance } from './entities/alliance.entity';
import { AllianceMember } from './entities/alliance-member.entity';
import { AllianceWar } from './entities/alliance-war.entity';
import { AllianceStorage } from './entities/alliance-storage.entity';
import { AllianceApplication } from './entities/alliance-application.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatReaction } from './entities/chat-reaction.entity';
import { AllianceDonation } from './entities/alliance-donation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Alliance,
      AllianceMember,
      AllianceWar,
      AllianceStorage,
      AllianceApplication,
      ChatMessage,
      ChatReaction,
      AllianceDonation,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AllianceController, AlliancePlayerController],
  providers: [AllianceService, AlliancePlayerService, AllianceChatGateway],
  exports: [AllianceService, AlliancePlayerService],
})
export class AllianceModule {}
