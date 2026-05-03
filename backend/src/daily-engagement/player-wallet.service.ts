import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerWallet } from './entities/player-wallet.entity';
import { StreakRewardType } from './types/daily-engagement.types';

@Injectable()
export class PlayerWalletService {
  constructor(
    @InjectRepository(PlayerWallet)
    private readonly walletRepo: Repository<PlayerWallet>,
  ) {}

  async getOrCreate(playerId: string): Promise<PlayerWallet> {
    let wallet = await this.walletRepo.findOne({ where: { playerId } });
    if (!wallet) {
      wallet = this.walletRepo.create({ playerId });
      wallet = await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  async creditReward(playerId: string, type: StreakRewardType, amount: number): Promise<PlayerWallet> {
    const wallet = await this.getOrCreate(playerId);

    switch (type) {
      case StreakRewardType.RESOURCES:
        wallet.resources += amount;
        break;
      case StreakRewardType.RARE_UNIT_SHARD:
        wallet.rareShards += amount;
        break;
      case StreakRewardType.PREMIUM_CURRENCY:
        wallet.premiumCurrency += amount;
        break;
      case StreakRewardType.EPIC_ITEM:
        wallet.rareShards += amount;
        break;
    }

    return this.walletRepo.save(wallet);
  }

  async creditBundle(
    playerId: string,
    resources: number,
    rareShards: number,
    premiumCurrency: number,
  ): Promise<PlayerWallet> {
    const wallet = await this.getOrCreate(playerId);
    wallet.resources += resources;
    wallet.rareShards += rareShards;
    wallet.premiumCurrency += premiumCurrency;
    return this.walletRepo.save(wallet);
  }
}
