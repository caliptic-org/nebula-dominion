import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mail } from './entities/mail.entity';
import { PlayerResource } from '../resources/entities/player-resource.entity';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mail, PlayerResource])],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
