import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: Omit<User, 'password'> }> {
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

    const { password: _, ...safeUser } = user;
    return {
      accessToken: this.signToken(user),
      user: safeUser as Omit<User, 'password'>,
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: Omit<User, 'password'> }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const { password: _, ...safeUser } = user;
    return {
      accessToken: this.signToken(user),
      user: safeUser as Omit<User, 'password'>,
    };
  }

  private signToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      username: user.username,
    });
  }
}
