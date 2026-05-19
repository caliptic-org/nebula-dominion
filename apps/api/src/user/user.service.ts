import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Race } from './entities/race.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PROFILE_FIELDS: (keyof User)[] = [
  'id',
  'email',
  'username',
  'race',
  'isActive',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
];

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepo.find({ select: PROFILE_FIELDS });
    return users as Omit<User, 'password'>[];
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id }, select: PROFILE_FIELDS });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user as Omit<User, 'password'>;
  }

  async getProfile(id: string): Promise<Omit<User, 'password'>> {
    return this.findOne(id);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (dto.username && dto.username !== user.username) {
      const taken = await this.userRepo.findOne({ where: { username: dto.username } });
      if (taken) throw new ConflictException('username already taken');
      user.username = dto.username;
    }

    await this.userRepo.save(user);
    return this.findOne(id);
  }

  async selectRace(id: string, race: Race): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (user.race) {
      throw new BadRequestException(
        'Race has already been chosen for this player and cannot be changed',
      );
    }
    user.race = race;
    await this.userRepo.save(user);
    return this.findOne(id);
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    user.isActive = false;
    await this.userRepo.save(user);
  }
}
