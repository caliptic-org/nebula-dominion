import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { GameState } from '../game-state/entities/game-state.entity';
import { PlayerScore } from '../scoreboard/entities/player-score.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, GameState, PlayerScore]),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
