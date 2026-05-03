import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: Omit<User, 'password'>;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) {
      throw new ConflictException('Email or username already taken');
    }

    const rounds = this.config.get<number>('bcrypt.rounds', 10);
    const hashed = await bcrypt.hash(dto.password, rounds);

    const user = this.userRepo.create({
      email: dto.email,
      username: dto.username,
      password: hashed,
    });
    await this.userRepo.save(user);

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const isEmail = dto.identifier.includes('@');
    const where = isEmail
      ? { email: dto.identifier.toLowerCase() }
      : { username: dto.identifier };
    const user = await this.userRepo.findOne({ where });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return this.buildAuthResult(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; type?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.userRepo.findOne({ where: { id: payload.sub, isActive: true } });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.signTokens(user);
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const { password: _, ...safe } = user;
    return safe as Omit<User, 'password'>;
  }

  private buildAuthResult(user: User): AuthResult {
    const tokens = this.signTokens(user);
    const { password: _, ...safeUser } = user;
    return { ...tokens, user: safeUser as Omit<User, 'password'> };
  }

  private signTokens(user: User): AuthTokens {
    const basePayload = { sub: user.id, email: user.email, username: user.username };
    const accessToken = this.jwtService.sign(basePayload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.expiresIn'),
    });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      },
    );
    return { accessToken, refreshToken };
  }
}
