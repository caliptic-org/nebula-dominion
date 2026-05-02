import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepo.find({ select: ['id', 'email', 'username', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'] });
    return users as Omit<User, 'password'>[];
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id }, select: ['id', 'email', 'username', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'] });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user as Omit<User, 'password'>;
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    user.isActive = false;
    await this.userRepo.save(user);
  }
}
