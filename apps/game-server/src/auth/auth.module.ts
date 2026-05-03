import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from './ws-jwt.guard';
import { HttpJwtGuard } from './http-jwt.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WsJwtGuard, HttpJwtGuard, AdminRoleGuard],
  exports: [JwtModule, WsJwtGuard, HttpJwtGuard, AdminRoleGuard],
})
export class AuthModule {}
