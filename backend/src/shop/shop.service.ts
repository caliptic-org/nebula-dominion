import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { ShopProduct } from './entities/shop-product.entity';
import { PlayerWallet } from './entities/player-wallet.entity';
import { PurchaseTransaction } from './entities/purchase-transaction.entity';
import { GameEvent } from './entities/game-event.entity';
import { RedisService } from '../redis/redis.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { PurchaseDto, PurchaseResponseDto } from './dto/purchase.dto';
import { Currency, PurchaseStatus } from './types/shop.types';

const PURCHASE_RATE_LIMIT = 10;
const PURCHASE_RATE_WINDOW_SECONDS = 60;

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    @InjectRepository(ShopProduct)
    private readonly productRepo: Repository<ShopProduct>,
    @InjectRepository(PlayerWallet)
    private readonly walletRepo: Repository<PlayerWallet>,
    @InjectRepository(PurchaseTransaction)
    private readonly txRepo: Repository<PurchaseTransaction>,
    @InjectRepository(GameEvent)
    private readonly eventRepo: Repository<GameEvent>,
    private readonly redis: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  async getProducts(query: GetProductsQueryDto): Promise<ShopProduct[]> {
    const where: Record<string, unknown> = { isActive: true };

    if (query.tab) {
      where.category = query.tab;
    }

    const products = await this.productRepo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    if (query.race) {
      return products.map((p) => ({
        ...p,
        raceMatch: p.raceExclusive === null || p.raceExclusive === query.race,
      })) as ShopProduct[];
    }

    return products;
  }

  async getPlayerBalance(playerId: string): Promise<{ gem: number; gold: number }> {
    const wallet = await this.walletRepo.findOne({ where: { playerId } });

    if (!wallet) {
      // Auto-create wallet with starting balance
      const newWallet = this.walletRepo.create({ playerId, gem: 0, gold: 0 });
      await this.walletRepo.save(newWallet);
      return { gem: 0, gold: 0 };
    }

    return { gem: wallet.gem, gold: wallet.gold };
  }

  async purchase(
    playerId: string,
    dto: PurchaseDto,
    idempotencyKey: string,
  ): Promise<PurchaseResponseDto> {
    await this.checkRateLimit(playerId);

    // Check idempotency: return cached result for duplicate keys
    const existing = await this.txRepo.findOne({ where: { idempotencyKey } });
    if (existing) {
      if (existing.status === PurchaseStatus.FAILED) {
        throw new BadRequestException(existing.failureReason ?? 'Purchase failed');
      }
      const balance = await this.getPlayerBalance(playerId);
      return {
        transactionId: existing.id,
        productId: existing.productId,
        currency: existing.currency,
        amount: existing.amount,
        balance,
      };
    }

    const product = await this.productRepo.findOne({ where: { id: dto.productId, isActive: true } });
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    const price = dto.currency === Currency.GEM ? product.gemPrice : product.goldPrice;
    if (!price) {
      throw new BadRequestException(`Product does not support ${dto.currency} payment`);
    }

    // Execute atomically in a transaction
    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(PlayerWallet);
      const txRepo = manager.getRepository(PurchaseTransaction);
      const productRepo = manager.getRepository(ShopProduct);

      // Lock wallet row for update to prevent race conditions
      const wallet = await walletRepo
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.player_id = :playerId', { playerId })
        .getOne();

      const currentBalance = wallet ?? { gem: 0, gold: 0 };
      const currentAmount = dto.currency === Currency.GEM ? currentBalance.gem : currentBalance.gold;

      if (currentAmount < price) {
        const tx = txRepo.create({
          idempotencyKey,
          playerId,
          productId: dto.productId,
          currency: dto.currency,
          amount: price,
          status: PurchaseStatus.FAILED,
          failureReason: `Insufficient ${dto.currency} balance`,
        });
        await txRepo.save(tx);
        throw new BadRequestException(`Insufficient ${dto.currency} balance`);
      }

      // Decrement stock if limited
      if (product.stock !== null) {
        const updated = await productRepo
          .createQueryBuilder()
          .update(ShopProduct)
          .set({ stock: () => 'stock - 1' })
          .where('id = :id AND stock > 0', { id: product.id })
          .execute();

        if (!updated.affected || updated.affected === 0) {
          throw new BadRequestException('Product is out of stock');
        }
      }

      // Deduct balance
      const newGem = dto.currency === Currency.GEM ? currentBalance.gem - price : currentBalance.gem;
      const newGold = dto.currency === Currency.GOLD ? currentBalance.gold - price : currentBalance.gold;

      if (wallet) {
        await walletRepo.update({ playerId }, { gem: newGem, gold: newGold });
      } else {
        const newWallet = walletRepo.create({ playerId, gem: newGem, gold: newGold });
        await walletRepo.save(newWallet);
      }

      // Record transaction
      const tx = txRepo.create({
        idempotencyKey,
        playerId,
        productId: dto.productId,
        currency: dto.currency,
        amount: price,
        status: PurchaseStatus.COMPLETED,
        gemBalanceAfter: newGem,
        goldBalanceAfter: newGold,
      });
      const savedTx = await txRepo.save(tx);

      this.logger.log(`Purchase completed: player=${playerId} product=${dto.productId} currency=${dto.currency} amount=${price}`);

      return {
        transactionId: savedTx.id,
        productId: dto.productId,
        currency: dto.currency,
        amount: price,
        balance: { gem: newGem, gold: newGold },
      };
    });
  }

  async getActiveEvents(): Promise<GameEvent[]> {
    return this.eventRepo.find({
      where: {
        isActive: true,
        endsAt: MoreThan(new Date()),
      },
      order: { endsAt: 'ASC' },
    });
  }

  private async checkRateLimit(playerId: string): Promise<void> {
    const key = `rate:purchase:${playerId}`;
    const count = await this.redis.incrWithExpire(key, PURCHASE_RATE_WINDOW_SECONDS);

    if (count > PURCHASE_RATE_LIMIT) {
      const ttl = await this.redis.ttl(key);
      throw new HttpException(
        `Purchase rate limit exceeded. Retry after ${ttl} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
