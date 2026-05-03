import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { Age3ContentModule } from './modules/age3-content/age3-content.module';
import { Age5ContentModule } from './modules/age5-content/age5-content.module';
import { AllianceModule } from './modules/alliance/alliance.module';
import { SubspaceModule } from './modules/subspace/subspace.module';
import { BossModule } from './modules/boss/boss.module';
import { ShopModule } from './modules/shop/shop.module';
import { PremiumModule } from './modules/premium/premium.module';
import { PaymentModule } from './modules/payment/payment.module';
import { CosmeticsModule } from './modules/cosmetics/cosmetics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRoot(databaseConfig),
    AuthModule,
    UserModule,
    Age3ContentModule,
    Age5ContentModule,
    AllianceModule,
    SubspaceModule,
    BossModule,
    ShopModule,
    PremiumModule,
    PaymentModule,
    CosmeticsModule,
  ],
})
export class AppModule {}
