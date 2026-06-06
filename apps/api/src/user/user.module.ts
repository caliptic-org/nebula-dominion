import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { OnboardingModule } from '../modules/onboarding/onboarding.module';

@Module({
  // OnboardingModule is imported (not just OnboardingService listed in
  // providers) because OnboardingService depends on TypeOrmModule.forFeature
  // bound inside OnboardingModule — declaring the service alone here would
  // leave its TutorialProgress repo unresolvable. OnboardingModule exports
  // OnboardingService so this import is enough. No circular dep: Onboarding
  // doesn't import UserService.
  imports: [TypeOrmModule.forFeature([User]), OnboardingModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
