import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Transaction } from './entities/transaction.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { UserConsent } from './entities/user-consent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, WebhookEvent, UserConsent])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
