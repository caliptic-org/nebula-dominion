import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { GameState } from '../game-state/entities/game-state.entity';
import { PlayerScore } from '../scoreboard/entities/player-score.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(GameState) private readonly gameStateRepo: Repository<GameState>,
    @InjectRepository(PlayerScore) private readonly scoreRepo: Repository<PlayerScore>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; userId: string }> {
    const existing = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new ConflictException('Username or email already taken');
    }

    const rounds = this.config.get<number>('bcryptRounds', 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
    });
    await this.userRepo.save(user);

    // Bootstrap initial game state and scoreboard entry
    await this.gameStateRepo.save(this.gameStateRepo.create({ userId: user.id }));
    await this.scoreRepo.save(this.scoreRepo.create({ userId: user.id, username: user.username }));

    const accessToken = this.jwtService.sign({ sub: user.id, username: user.username });
    return { accessToken, userId: user.id };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; userId: string }> {
    const user = await this.userRepo.findOne({ where: { username: dto.username } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const accessToken = this.jwtService.sign({ sub: user.id, username: user.username });
    return { accessToken, userId: user.id };
  }
}
