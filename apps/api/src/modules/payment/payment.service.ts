import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import { Transaction } from './entities/transaction.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { UserConsent } from './entities/user-consent.entity';

interface CreatePaymentIntentDto {
  itemSku?: string;
  passCode?: string;
  currencyCode: 'USD' | 'TRY';
  provider: 'stripe' | 'iyzico';
  userIp: string;
  userAgent?: string;
  countryCode?: string;
}

interface IyzicoCallbackDto {
  conversationId: string;
  paymentStatus: string;
  paymentId: string;
  token?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(WebhookEvent)
    private readonly webhookRepository: Repository<WebhookEvent>,
    @InjectRepository(UserConsent)
    private readonly consentRepository: Repository<UserConsent>,
  ) {}

  // ==========================================
  // Stripe Payment Intent
  // ==========================================

  async createStripePaymentIntent(
    userId: string,
    dto: CreatePaymentIntentDto,
  ): Promise<Record<string, unknown>> {
    const amount = await this.resolveAmount(dto.itemSku, dto.passCode, dto.currencyCode);
    if (!amount) throw new BadRequestException('Item veya pass bulunamadı');

    const transaction = await this.transactionRepository.save(
      this.transactionRepository.create({
        userId,
        transactionType: dto.passCode ? 'purchase_premium_pass' : 'purchase_item',
        status: 'pending',
        provider: 'stripe',
        shopItemId: null,
        premiumPassId: null,
        amountUsd: dto.currencyCode === 'USD' ? amount : null,
        amountTry: dto.currencyCode === 'TRY' ? amount : null,
        currencyCode: dto.currencyCode,
        ipAddress: dto.userIp,
        userAgent: dto.userAgent ?? null,
        countryCode: dto.countryCode ?? null,
      }),
    );

    // Gerçek implementasyonda: Stripe SDK ile PaymentIntent oluştur
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const intent = await stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100),
    //   currency: dto.currencyCode.toLowerCase(),
    //   metadata: { transactionId: transaction.id, userId },
    // });

    const mockClientSecret = `pi_${transaction.id.replace(/-/g, '')}_secret_mock`;

    this.logger.log(`Stripe ödeme niyeti oluşturuldu: txn=${transaction.id}, tutar=${amount} ${dto.currencyCode}`);

    return {
      transactionId: transaction.id,
      clientSecret: mockClientSecret,
      amount,
      currency: dto.currencyCode,
      provider: 'stripe',
    };
  }

  // ==========================================
  // iyzico Payment (Türkiye için)
  // ==========================================

  async createIyzicoPayment(
    userId: string,
    dto: CreatePaymentIntentDto & {
      buyerEmail: string;
      buyerName: string;
      buyerSurname: string;
      buyerPhone?: string;
      buyerCity?: string;
    },
  ): Promise<Record<string, unknown>> {
    if (dto.currencyCode !== 'TRY') {
      throw new BadRequestException('iyzico yalnızca TRY destekler');
    }

    const amount = await this.resolveAmount(dto.itemSku, dto.passCode, 'TRY');
    if (!amount) throw new BadRequestException('Item veya pass bulunamadı');

    const conversationId = `nebula-${userId.substring(0, 8)}-${Date.now()}`;

    const transaction = await this.transactionRepository.save(
      this.transactionRepository.create({
        userId,
        transactionType: dto.passCode ? 'purchase_premium_pass' : 'purchase_item',
        status: 'pending',
        provider: 'iyzico',
        amountTry: amount,
        currencyCode: 'TRY',
        providerOrderId: conversationId,
        ipAddress: dto.userIp,
        userAgent: dto.userAgent ?? null,
        countryCode: 'TR',
      }),
    );

    // Gerçek iyzico implementasyonu:
    // const iyzipay = new Iyzipay({ apiKey, secretKey, uri: 'https://api.iyzipay.com' });
    // iyzipay.checkoutFormInitialize.create(request, callback);

    const basketItem = {
      id: dto.itemSku || dto.passCode,
      name: dto.itemSku || dto.passCode,
      category1: 'Oyun',
      category2: 'Nebula Dominion',
      itemType: 'VIRTUAL',
      price: amount.toFixed(2),
    };

    const mockPaymentPageUrl = `https://sandbox-api.iyzipay.com/payment/form?conversationId=${conversationId}`;

    this.logger.log(`iyzico ödeme oluşturuldu: txn=${transaction.id}, tutar=${amount} TRY`);

    return {
      transactionId: transaction.id,
      conversationId,
      paymentPageUrl: mockPaymentPageUrl,
      amount,
      currency: 'TRY',
      provider: 'iyzico',
      basketItems: [basketItem],
    };
  }

  // ==========================================
  // Stripe Webhook Handler
  // ==========================================

  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<Record<string, unknown>> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET ortam değişkeni eksik');
    }

    let isVerified = false;
    let eventId = '';
    let eventType = '';
    let payload: Record<string, unknown> = {};

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
      const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      eventId = stripeEvent.id;
      eventType = stripeEvent.type;
      payload = stripeEvent as unknown as Record<string, unknown>;
      isVerified = true;
    } catch (err) {
      throw new UnauthorizedException('Stripe webhook imzası geçersiz');
    }

    const event = await this.webhookRepository.save(
      this.webhookRepository.create({
        provider: 'stripe',
        eventId,
        eventType,
        payload,
        signature,
        isVerified,
        isProcessed: false,
      }),
    );

    await this.processStripeEvent(event);
    return { received: true, eventId };
  }

  // ==========================================
  // iyzico Webhook / Callback Handler
  // ==========================================

  async handleIyzicoCallback(
    callbackData: IyzicoCallbackDto,
    rawBody: string,
  ): Promise<Record<string, unknown>> {
    const secretKey = process.env.IYZICO_SECRET_KEY;
    if (!secretKey) {
      throw new UnauthorizedException('IYZICO_SECRET_KEY ortam değişkeni eksik');
    }

    // iyzico imza doğrulama — HMAC-SHA256 + constant-time comparison
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(callbackData.conversationId + callbackData.paymentStatus)
      .digest('base64');

    const receivedToken = callbackData.token ?? '';
    let isVerified = false;
    if (receivedToken.length === expectedHash.length) {
      isVerified = crypto.timingSafeEqual(
        Buffer.from(expectedHash),
        Buffer.from(receivedToken),
      );
    }

    const event = await this.webhookRepository.save(
      this.webhookRepository.create({
        provider: 'iyzico',
        eventId: `iyz-${callbackData.paymentId}-${Date.now()}`,
        eventType: `payment.${callbackData.paymentStatus}`,
        payload: callbackData as unknown as Record<string, unknown>,
        signature: callbackData.token ?? null,
        isVerified,
        isProcessed: false,
      }),
    );

    await this.processIyzicoEvent(event, callbackData);
    return { received: true };
  }

  // ==========================================
  // Transaction Processing
  // ==========================================

  private async processStripeEvent(event: WebhookEvent): Promise<void> {
    try {
      if (event.eventType === 'payment_intent.succeeded') {
        const paymentIntent = event.payload.data as Record<string, unknown>;
        const metadata = (paymentIntent?.metadata as Record<string, string>) || {};
        const transactionId = metadata.transactionId;

        if (transactionId) {
          await this.completeTransaction(transactionId, `pi_${transactionId}`);
        }
      } else if (event.eventType === 'payment_intent.payment_failed') {
        const paymentIntent = event.payload.data as Record<string, unknown>;
        const metadata = (paymentIntent?.metadata as Record<string, string>) || {};
        if (metadata.transactionId) {
          await this.failTransaction(metadata.transactionId, 'Stripe ödeme başarısız');
        }
      } else if (event.eventType === 'charge.refunded') {
        this.logger.warn(`Stripe iade alındı: ${event.eventId}`);
      }

      event.isProcessed = true;
      event.processedAt = new Date();
      await this.webhookRepository.save(event);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      event.processingError = message;
      await this.webhookRepository.save(event);
      this.logger.error(`Stripe webhook işleme hatası: ${message}`);
    }
  }

  private async processIyzicoEvent(
    event: WebhookEvent,
    callback: IyzicoCallbackDto,
  ): Promise<void> {
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { providerOrderId: callback.conversationId },
      });

      if (!transaction) {
        this.logger.warn(`iyzico: conversationId eşleşmesi yok: ${callback.conversationId}`);
        return;
      }

      if (callback.paymentStatus === 'SUCCESS') {
        await this.completeTransaction(transaction.id, callback.paymentId);
      } else {
        await this.failTransaction(transaction.id, `iyzico ödeme başarısız: ${callback.paymentStatus}`);
      }

      event.isProcessed = true;
      event.processedAt = new Date();
      event.transactionId = transaction.id;
      await this.webhookRepository.save(event);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      event.processingError = message;
      await this.webhookRepository.save(event);
      this.logger.error(`iyzico callback işleme hatası: ${message}`);
    }
  }

  private async completeTransaction(
    transactionId: string,
    providerPaymentId: string,
  ): Promise<void> {
    const tx = await this.transactionRepository.findOne({ where: { id: transactionId } });
    if (!tx) return;

    tx.status = 'completed';
    tx.providerPaymentId = providerPaymentId;
    await this.transactionRepository.save(tx);

    this.logger.log(`Ödeme tamamlandı: txn=${transactionId}`);
  }

  private async failTransaction(transactionId: string, reason: string): Promise<void> {
    const tx = await this.transactionRepository.findOne({ where: { id: transactionId } });
    if (!tx) return;

    tx.status = 'failed';
    tx.notes = reason;
    await this.transactionRepository.save(tx);

    this.logger.warn(`Ödeme başarısız: txn=${transactionId}, neden=${reason}`);
  }

  async processRefund(
    transactionId: string,
    reason: string,
    adminUserId: string,
  ): Promise<Transaction> {
    const tx = await this.transactionRepository.findOne({
      where: { id: transactionId, status: 'completed' },
    });
    if (!tx) throw new NotFoundException('Tamamlanmış işlem bulunamadı');

    tx.status = 'refunded';
    tx.refundedAt = new Date();
    tx.refundReason = reason;
    tx.notes = `İade işlemi: ${adminUserId} tarafından`;

    const saved = await this.transactionRepository.save(tx);
    this.logger.log(`İade işlendi: txn=${transactionId}, yönetici=${adminUserId}`);
    return saved;
  }

  async getUserTransactions(userId: string, limit = 20) {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ==========================================
  // KVKK / GDPR Uyumu
  // ==========================================

  async recordConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    ipAddress: string,
    userAgent?: string,
    version = '1.0',
  ): Promise<UserConsent> {
    const existing = await this.consentRepository.findOne({
      where: { userId, consentType, version },
    });

    if (existing) {
      existing.granted = granted;
      if (granted) {
        existing.grantedAt = new Date();
        existing.revokedAt = null;
      } else {
        existing.revokedAt = new Date();
      }
      return this.consentRepository.save(existing);
    }

    return this.consentRepository.save(
      this.consentRepository.create({
        userId,
        consentType,
        granted,
        version,
        ipAddress,
        userAgent: userAgent ?? null,
        grantedAt: granted ? new Date() : null,
      }),
    );
  }

  async getUserConsents(userId: string) {
    return this.consentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeAllConsents(userId: string, ipAddress: string): Promise<void> {
    const consents = await this.consentRepository.find({
      where: { userId, granted: true },
    });

    for (const consent of consents) {
      consent.granted = false;
      consent.revokedAt = new Date();
    }

    await this.consentRepository.save(consents);
    this.logger.log(`Tüm onaylar geri alındı: kullanıcı=${userId}`);
  }

  async anonymizeUserPaymentData(userId: string): Promise<Record<string, unknown>> {
    const transactions = await this.transactionRepository.find({ where: { userId } });

    for (const tx of transactions) {
      tx.ipAddress = null;
      tx.userAgent = null;
      tx.providerResponse = null;
      tx.notes = '[ANONİM]';
    }

    await this.transactionRepository.save(transactions);

    this.logger.log(`Ödeme verileri anonimleştirildi: kullanıcı=${userId}, kayıt=${transactions.length}`);
    return {
      anonymizedCount: transactions.length,
      userId,
      anonymizedAt: new Date(),
    };
  }

  // ==========================================
  // Yardımcı metodlar
  // ==========================================

  private async resolveAmount(
    itemSku?: string,
    passCode?: string,
    currency: 'USD' | 'TRY' = 'USD',
  ): Promise<number | null> {
    if (itemSku) {
      // Gerçekte ShopItem tablosundan çekilir
      const priceMap: Record<string, Record<string, number>> = {
        gems_100: { USD: 0.99, TRY: 34.99 },
        gems_550: { USD: 4.99, TRY: 179.99 },
        gems_1200: { USD: 9.99, TRY: 349.99 },
        gems_2800: { USD: 19.99, TRY: 699.99 },
        gems_6500: { USD: 49.99, TRY: 1749.99 },
      };
      return priceMap[itemSku]?.[currency] ?? null;
    }
    if (passCode) {
      const passMap: Record<string, Record<string, number>> = {
        monthly_pass: { USD: 4.99, TRY: 179.99 },
        battle_pass_season5: { USD: 9.99, TRY: 349.99 },
        annual_pass: { USD: 39.99, TRY: 1399.99 },
      };
      return passMap[passCode]?.[currency] ?? null;
    }
    return null;
  }
}
