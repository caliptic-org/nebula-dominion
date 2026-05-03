import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { Age3ContentModule } from './modules/age3-content/age3-content.module';
import { Age5ContentModule } from './modules/age5-content/age5-content.module';
import { AllianceModule } from './modules/alliance/alliance.module';
import { SubspaceModule } from './modules/subspace/subspace.module';
import { BossModule } from './modules/boss/boss.module';
import { ShopModule } from './modules/shop/shop.module';
import { PremiumModule } from './modules/premium/premium.module';
import { PaymentModule } from './modules/payment/payment.module';
import { EventsModule } from './modules/events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    Age3ContentModule,
    Age5ContentModule,
    AllianceModule,
    SubspaceModule,
    BossModule,
    ShopModule,
    PremiumModule,
    PaymentModule,
    EventsModule,
  ],
})
export class AppModule {}
