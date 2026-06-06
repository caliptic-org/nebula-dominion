import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import { Transaction } from './entities/transaction.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { UserConsent } from './entities/user-consent.entity';
import { VipService } from '../vip/vip.service';

interface CreatePaymentIntentDto {
  itemSku?: string;
  passCode?: string;
  currencyCode: 'USD' | 'TRY';
  provider: 'stripe' | 'iyzico' | 'google_pay' | 'apple_pay';
  userIp: string;
  userAgent?: string;
  countryCode?: string;
}

/** Web-checkout sessions for Google Pay / Apple Pay on the browser.  These
 *  are PaymentRequest API tokens (Google Pay JS / Apple Pay JS); when wired
 *  for real production they end up routing through Stripe under the hood
 *  (Stripe's `paymentRequestButton` accepts both wallets natively). For the
 *  current playtest the session is a stub that the FE confirms via
 *  POST /payment/mock/complete/:id so the granting flow runs end-to-end.
 */
interface CreateWebPaymentDto extends CreatePaymentIntentDto {
  provider: 'google_pay' | 'apple_pay';
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly vipService: VipService,
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

    // basketItem is the payload iyzico would receive — keep it referenced
    // so a future swap to the real Iyzipay SDK has the canonical shape to
    // hand off. Logged at debug level so it isn't noise in normal runs.
    this.logger.debug(`iyzico basket item shape: ${JSON.stringify(basketItem)}`);
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
  // Google Pay / Apple Pay — Web Wallet Checkout
  // ==========================================
  //
  // For the playtest the wallet flow is a stub: the FE calls
  // /payment/web/create-payment to mint a pending transaction, the user
  // taps the Google Pay / Apple Pay button rendered via the browser's
  // PaymentRequest API, then the FE confirms via /payment/mock/complete
  // which calls completeTransaction below (same path as a real Stripe
  // webhook → VIP record + pass grant). When real production credentials
  // land the mock-complete handler is replaced with a real Stripe / Apple
  // Pay merchant verification webhook; the rest of the pipeline stays.

  async createWebPayment(
    userId: string,
    dto: CreateWebPaymentDto,
  ): Promise<Record<string, unknown>> {
    const amount = await this.resolveAmount(dto.itemSku, dto.passCode, dto.currencyCode);
    if (!amount) throw new BadRequestException('Item veya pass bulunamadı');

    const transaction = await this.transactionRepository.save(
      this.transactionRepository.create({
        userId,
        transactionType: dto.passCode ? 'purchase_premium_pass' : 'purchase_item',
        status: 'pending',
        provider: dto.provider,
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

    // Session token the FE hands to the wallet API.  For real production this
    // would be a Stripe PaymentIntent client_secret (Stripe's
    // paymentRequestButton handles GPay/ApplePay tokenisation transparently).
    // For the stub it's a deterministic value the mock-complete endpoint can
    // verify against the transaction row.
    const sessionToken = `web_${transaction.id.replace(/-/g, '')}_${dto.provider}`;

    this.logger.log(
      `Web wallet (${dto.provider}) ödeme niyeti: txn=${transaction.id}, tutar=${amount} ${dto.currencyCode}`,
    );

    return {
      transactionId: transaction.id,
      sessionToken,
      amount,
      currency: dto.currencyCode,
      provider: dto.provider,
      // Hint for the FE: when these env vars are present we render the real
      // wallet buttons.  When absent (or playtest mode) the FE shows a
      // "Stub Onayla" button that calls /payment/mock/complete directly.
      walletReady: {
        googlePay: Boolean(process.env.GOOGLE_PAY_MERCHANT_ID),
        applePay: Boolean(process.env.APPLE_PAY_MERCHANT_ID),
      },
    };
  }

  /**
   * Mock-confirm a pending transaction.  Public version of completeTransaction
   * intended for playtest builds — finishes the row, records the VIP spend,
   * grants the pass.  Gated by PAYMENT_MOCK_ENABLED env (default OFF in
   * production, ON otherwise) so a misbehaving client can't grant itself a
   * VIP pass on a real shipping build.
   *
   * Caller MUST be the owner of the transaction (controller enforces this).
   *
   * --------------------------------------------------------------------------
   * Concurrency contract (engine audit cycle 6 — HIGH ECON-PAY-MOCKCOMPLETE-RACE)
   * --------------------------------------------------------------------------
   * Earlier revisions did a plain `findOne` → status==="pending" check →
   * `completeTransaction(...)` with no row lock.  Two parallel POSTs to
   * `/payment/mock/complete/:tx` with the same transactionId both observed
   * status="pending" simultaneously and both went on to call
   * `recordPurchaseAndUpgradeVip` — the user got their cumulative spend
   * credited twice and could cross a VIP threshold for free.  The endpoint
   * is gated behind PAYMENT_MOCK_ENABLED so it's not reachable in prod,
   * but staging/playtest builds flip the flag and were exposed.
   *
   * The fix wraps the read+guard inside a `dataSource.transaction` and takes
   * a `pessimistic_write` (SELECT … FOR UPDATE) lock on the transactions
   * row.  PostgreSQL serialises the two contenders: the first holder sees
   * status="pending" and flips it to "completed" before COMMIT.  The second
   * caller's `findOne` blocks until that COMMIT, then reads the already-
   * flipped row and returns `alreadyCompleted` without re-running the VIP
   * credit path.
   *
   * This is defense-in-depth against the idempotency guard the audit added
   * to `completeTransaction` (cycle A2): even if that downstream guard ever
   * regresses, the lock here keeps the VIP spend from being double-counted.
   */
  async mockCompleteTransaction(userId: string, transactionId: string): Promise<Transaction> {
    // STRICT opt-in: explicit PAYMENT_MOCK_ENABLED=true required, no
    // matter the NODE_ENV.  The previous "default ON when env is unset
    // and not prod" branch let an operator flip NODE_ENV=staging and
    // suddenly allow free pass grants — engine audit flagged it as
    // HIGH.  Anyone running the playtest profile sets the flag
    // explicitly via /opt/nebula-dominion/.env; staging/CI clusters
    // that forget to set it now stay locked, fail-safe.
    const allowed = process.env.PAYMENT_MOCK_ENABLED === 'true';
    if (!allowed) {
      throw new BadRequestException('Mock onayı kapalı (PAYMENT_MOCK_ENABLED!=true)');
    }

    // Take a row-level write lock on the transactions row so the
    // status check and the downstream `completeTransaction` cannot
    // interleave with a parallel POST for the same id.  Two callers
    // SELECT … FOR UPDATE on the same row; PostgreSQL serialises them.
    //
    // Winner flow:
    //   1. acquires the lock, observes status="pending"
    //   2. inside the lock: flips status→"completed", saves, then runs
    //      the VIP credit / pass grant pipeline via completeTransaction
    //   3. COMMIT releases the lock
    // Loser flow:
    //   1. blocks on FOR UPDATE while winner is in flight
    //   2. once winner COMMITs, loser's findOne returns the row with
    //      status="completed" → falls through, no VIP re-credit
    //
    // We intentionally run `completeTransaction` INSIDE the transaction
    // so the VIP-credit work and the status flip commit atomically; if
    // the VIP write fails the status flip rolls back and the caller can
    // retry safely.  completeTransaction uses the repository (not the
    // locked entity manager) for its own writes, but those writes
    // target child rows (vip_history, etc.) — the status row stays
    // locked for the duration via the outer transaction.
    await this.dataSource.transaction(async (em) => {
      const tx = await em.findOne(Transaction, {
        where: { id: transactionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!tx) throw new NotFoundException('İşlem bulunamadı');
      if (tx.userId !== userId) throw new UnauthorizedException('Bu işlem size ait değil');

      if (tx.status === 'completed') {
        // Loser path: winner already flipped the row.  Return the
        // already-completed row without re-running the grant pipeline.
        return;
      }
      if (tx.status !== 'pending') {
        // refunded / failed / cancelled — surface to caller
        throw new BadRequestException(`İşlem zaten ${tx.status} durumunda`);
      }

      // Winner path: still pending under the lock.  Run the same
      // completion pipeline a real Stripe/iyzico webhook would.
      await this.completeTransaction(tx.id, `mock_${tx.id}`);
    });

    return (await this.transactionRepository.findOne({ where: { id: transactionId } }))!;
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

  /**
   * Handle an iyzico async callback. Idempotent on `paymentId`.
   *
   * **Replay-safety contract** (the reason this method matters):
   *
   *   The webhook_event row's natural key is `(provider, eventId)` with a
   *   UNIQUE constraint at the DB level (see WebhookEvent entity).  For
   *   the constraint to actually defend against replays, `eventId` MUST
   *   be deterministic from the upstream event — same callback, same
   *   key, second INSERT → Postgres 23505 → we short-circuit before
   *   `processIyzicoEvent` ever calls `recordPurchaseAndUpgradeVip`.
   *
   *   Prior to this fix the eventId was built as
   *     `iyz-${callbackData.paymentId}-${Date.now()}`
   *   which embedded a wall-clock suffix in the key — every replay was a
   *   different key, every replay passed the constraint, every replay
   *   credited cumulative VIP spend a second time.  An attacker who
   *   captured one legitimate SUCCESS callback (or who got iyzico to
   *   re-deliver, which iyzico does on 5xx) could farm VIP tier
   *   upgrades by re-POSTing the body N times.  HIGH severity —
   *   cycle-5 audit BLOCKER ECON-PAY-IYZICO-EVENTID-REPLAY.
   *
   *   The new contract:
   *     eventId = `iyz-${paymentId}`        (no timestamp, deterministic)
   *
   *   Stripe path is unaffected — it already uses Stripe's own event id
   *   (`stripeEvent.id`) which is upstream-deterministic by design.
   *
   * On replay the response is `{ received: true, duplicate: true }` with
   * HTTP 200 so iyzico's retry loop stops (anything else, including 409,
   * makes them keep retrying).
   */
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

    // Deterministic dedup key — DO NOT add a timestamp or random suffix.
    // The UNIQUE(provider, eventId) index relies on this being stable
    // across iyzico's redelivery attempts.  See JSDoc above.
    const eventId = `iyz-${callbackData.paymentId}`;

    let event: WebhookEvent;
    try {
      event = await this.webhookRepository.save(
        this.webhookRepository.create({
          provider: 'iyzico',
          eventId,
          eventType: `payment.${callbackData.paymentStatus}`,
          payload: callbackData as unknown as Record<string, unknown>,
          signature: callbackData.token ?? null,
          isVerified,
          isProcessed: false,
        }),
      );
    } catch (err: unknown) {
      // Replay path: another (identical) callback for the same paymentId
      // already wrote the row. We MUST NOT re-run processIyzicoEvent — it
      // would call completeTransaction → recordPurchaseAndUpgradeVip a
      // second time and inflate cumulative spend → free VIP tier.
      if (err instanceof QueryFailedError) {
        const code = (err.driverError as { code?: string } | undefined)?.code;
        if (code === '23505') {
          this.logger.warn(
            `iyzico callback replay ignored: paymentId=${callbackData.paymentId} conv=${callbackData.conversationId}`,
          );
          return { received: true, duplicate: true };
        }
      }
      throw err;
    }

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

  /**
   * Finalise a pending transaction and credit the VIP cumulative-spend
   * ledger.
   *
   * IDEMPOTENCY CONTRACT (audit cycle 6, ECON-PAY-COMPLETETX-NO-IDEMPOTENCY)
   * ─────────────────────────────────────────────────────────────────────
   * Previous implementation had no `tx.status === 'completed'` guard,
   * so any re-entry — a Stripe webhook re-delivery after a crash, a
   * concurrent /payment/mock/complete race, a future admin "force
   * re-grant" tool — would re-run
   * vipService.recordPurchaseAndUpgradeVip, silently double-bumping
   * the user's cumulative_spend_usd and potentially shoving them up
   * an extra VIP tier per replay. Free VIP tier inflation = direct
   * revenue impact.
   *
   * Two-layer defence:
   *   1. SERVICE GUARD (here): if status is already 'completed', return
   *      immediately without touching the VIP ledger. Catches the
   *      common case (webhook resend after the row was already saved).
   *   2. DEFENSE-IN-DEPTH (process_vip_spend SQL function +
   *      UNIQUE(transaction_id) on vip_spend_ledger, migration
   *      1779900000000-AddVipSpendIdempotencyLedger): a concurrent
   *      caller that slipped past the JS guard — two parallel
   *      processStripeEvent runs that both findOne() before either
   *      save()s — will hit the unique-violation inside the DB
   *      function and the INSERT is swallowed. Only the first call
   *      credits the ledger.
   *
   * One-shot per-transactionId is the canonical contract: callers may
   * invoke completeTransaction(tx.id, …) any number of times; only
   * the first call mutates state.
   */
  private async completeTransaction(
    transactionId: string,
    providerPaymentId: string,
  ): Promise<{ alreadyCompleted: boolean; transactionId: string } | void> {
    // Layer 1: race-safe idempotency guard. Atomic conditional UPDATE
    // — the WHERE clause filters status='pending', so two concurrent
    // callers serialise on the row lock; only the first one matches and
    // gets a RETURNING row. The loser's UPDATE affects 0 rows and we
    // bail. This closes the findOne→save TOCTOU that the previous
    // implementation had (two parallel calls would both observe
    // status='pending' and both proceed to VIP credit).
    const updated = await this.dataSource.query<
      Array<{ id: string; user_id: string }>
    >(
      `UPDATE transactions
          SET status = 'completed',
              provider_payment_id = $2,
              updated_at = NOW()
        WHERE id = $1::uuid
          AND status = 'pending'
        RETURNING id, user_id`,
      [transactionId, providerPaymentId],
    );

    if (updated.length === 0) {
      // Either tx doesn't exist or it was already non-pending. Re-read
      // to decide which.
      const tx = await this.transactionRepository.findOne({
        where: { id: transactionId },
      });
      if (!tx) {
        this.logger.warn(`completeTransaction: tx bulunamadı: ${transactionId}`);
        return;
      }
      this.logger.log(
        `completeTransaction: yinelenen tamamlama atlandı (status=${tx.status}): txn=${transactionId}`,
      );
      return { alreadyCompleted: true, transactionId };
    }

    // We hold the "first completer" claim on this row. Re-read the full
    // entity for the VIP credit payload (amount fields, country, etc.)
    const tx = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });
    if (!tx) {
      // Should never happen — we just UPDATE-RETURNING'd this row.
      this.logger.error(
        `completeTransaction: post-update lookup boş: ${transactionId}`,
      );
      return;
    }

    this.logger.log(`Ödeme tamamlandı: txn=${transactionId}`);

    // VIP cumulative spend update + per-user ARPPU telemetry. The SQL
    // function's vip_spend_ledger UNIQUE(transaction_id) is layer 2:
    // belt-and-braces in case a future caller bypasses the atomic
    // UPDATE above (e.g. an admin "force re-grant" tool that flips
    // status back to pending). QueryFailedError 23505 is the duplicate
    // signal; swallow it so the rest of the flow proceeds.
    try {
      const vipResult = await this.vipService.recordPurchaseAndUpgradeVip({
        userId: tx.userId,
        transactionId: tx.id,
        amountUsd: tx.amountUsd,
        amountTry: tx.amountTry,
        currencyCode: tx.currencyCode,
        purchaseType: tx.transactionType,
        countryCode: tx.countryCode,
      });

      if (vipResult.upgraded) {
        this.logger.log(
          `VIP yükseltme sonrası bildirim gönderilecek: kullanıcı=${tx.userId} VIP${vipResult.oldVipLevel}→VIP${vipResult.newVipLevel}`,
        );
      }
    } catch (err: unknown) {
      if (
        err instanceof QueryFailedError &&
        (err as { code?: string }).code === '23505'
      ) {
        this.logger.warn(
          `completeTransaction: VIP ledger duplicate caught (layer-2): txn=${transactionId}`,
        );
        return;
      }
      throw err;
    }
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
