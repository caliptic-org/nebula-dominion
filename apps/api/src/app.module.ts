import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GameModule } from './game/game.module';
import { UnitModule } from './unit/unit.module';
import { BuildingModule } from './building/building.module';
import { ResourceModule } from './resource/resource.module';
import { Age3ContentModule } from './modules/age3-content/age3-content.module';
import { Age5ContentModule } from './modules/age5-content/age5-content.module';
import { SubspaceModule } from './modules/subspace/subspace.module';
import { BossModule } from './modules/boss/boss.module';
import { ShopModule } from './modules/shop/shop.module';
import { PremiumModule } from './modules/premium/premium.module';
import { PaymentModule } from './modules/payment/payment.module';
import { EventsModule } from './modules/events/events.module';
import { CosmeticsModule } from './modules/cosmetics/cosmetics.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StoryModule } from './modules/story/story.module';
import { TierModule } from './modules/tier/tier.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { DailyEngagementModule } from './modules/daily-engagement/daily-engagement.module';
import { HealthModule } from './health/health.module';
import { AllianceModule } from './modules/alliance/alliance.module';
import { VipModule } from './modules/vip/vip.module';
import { Age2ContentModule } from './modules/age2-content/age2-content.module';
import { MetaModule } from './meta/meta.module';
import { MapModule } from '../../../backend/src/map/map.module';
import { ConversionsModule } from './modules/conversions/conversions.module';
import { FormationsModule } from './modules/formations/formations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRoot(databaseConfig),
    AuthModule,
    UserModule,
    GameModule,
    UnitModule,
    BuildingModule,
    ResourceModule,
    Age3ContentModule,
    Age5ContentModule,
    SubspaceModule,
    BossModule,
    ShopModule,
    PremiumModule,
    PaymentModule,
    EventsModule,
    CosmeticsModule,
    InventoryModule,
    StoryModule,
    TierModule,
    OnboardingModule,
    DailyEngagementModule,
    HealthModule,
    AllianceModule,
    VipModule,
    Age2ContentModule,
    MetaModule,
    MapModule,
    ConversionsModule,
    FormationsModule,
  ],
})
export class AppModule {}
