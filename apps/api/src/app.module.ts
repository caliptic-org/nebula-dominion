import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { Age2ContentModule } from './modules/age2-content/age2-content.module';
import { Age5ContentModule } from './modules/age5-content/age5-content.module';
import { SubspaceModule } from './modules/subspace/subspace.module';
import { BossModule } from './modules/boss/boss.module';
import { ShopModule } from './modules/shop/shop.module';
import { PremiumModule } from './modules/premium/premium.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    Age2ContentModule,
    Age5ContentModule,
    SubspaceModule,
    BossModule,
    ShopModule,
    PremiumModule,
    PaymentModule,
  ],
})
export class AppModule {}
