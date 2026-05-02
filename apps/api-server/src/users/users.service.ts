import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getProfile(id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  async updateProfile(
    requesterId: string,
    targetId: string,
    dto: UpdateProfileDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    if (requesterId !== targetId) {
      throw new ForbiddenException('Cannot modify another user profile');
    }
    const user = await this.findById(targetId);
    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...profile } = saved;
    return profile;
  }

  async searchByUsername(query: string, limit = 20): Promise<Partial<User>[]> {
    return this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.username', 'u.displayName', 'u.avatarUrl'])
      .where('u.username ILIKE :q', { q: `%${query}%` })
      .andWhere('u.isActive = true')
      .limit(Math.min(limit, 50))
      .getMany();
  }
}
