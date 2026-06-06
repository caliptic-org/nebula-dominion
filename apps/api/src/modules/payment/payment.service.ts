import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import { Transaction } from './entities/transaction.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { UserConsent } from './entities/user-consent.entity';
import { VipService } from '../vip/vip.service';

/**
 * Fulfillment spec snapshotted from the shop_items / premium_passes
 * catalog at create-intent time and persisted onto the Transaction row.
 * The webhook handler re-reads this from the locked transaction row
 * (NOT from the live catalog) so a price/content edit between intent
 * and webhook can't change what gets delivered.  See JSDoc on
 * `completeTransaction` for the full delivery contract.
 */
interface FulfillmentSpec {
  itemSku: string | null;
  passCode: string | null;
  shopItemId: string | null;
  premiumPassId: string | null;
  quantity: number;
  nebulaCoinsDelta: number;
  premiumGemsDelta: number;
  voidCrystalsDelta: number;
}

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

    // BLOCKER fix — PAYMENT-COMPLETETX-NO-FULFILLMENT (audit cycle 6).
    // Snapshot the catalog payload (SKU/passCode + derived deltas) onto
    // the Transaction at intent time so the webhook can fulfil the
    // purchase even after a 30-day replay window.  Catalog drift is
    // safe: post-snapshot edits to shop_items.content don't affect
    // what gets delivered.
    const spec = await this.resolveFulfillmentSpec(dto.itemSku, dto.passCode);

    const transaction = await this.transactionRepository.save(
      this.transactionRepository.create({
        userId,
        transactionType: dto.passCode ? 'purchase_premium_pass' : 'purchase_item',
        status: 'pending',
        provider: 'stripe',
        shopItemId: spec.shopItemId,
        premiumPassId: spec.premiumPassId,
        itemSku: spec.itemSku,
        passCode: spec.passCode,
        quantity: spec.quantity,
        nebulaCoinsDelta: spec.nebulaCoinsDelta,
        premiumGemsDelta: spec.premiumGemsDelta,
        voidCrystalsDelta: spec.voidCrystalsDelta,
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

    // BLOCKER fix — PAY-IYZICO-PREDICTABLE-CONVID (audit cycle 6).
    // Earlier revisions built conversationId from
    //   `nebula-${userId.substring(0,8)}-${Date.now()}`
    // which is fully predictable for any authenticated attacker:
    // they know their own userId prefix and the wall-clock, so they
    // can forge a conversationId for a legitimate pending transaction
    // and feed it to handleIyzicoCallback.  Combined with the (now-
    // fixed) unverified-callback BLOCKER (PAY-IYZICO-UNVERIFIED-CALLBACK)
    // this gave free wallet credits + VIP tier upgrades.
    //
    // Even with the signature gate now in place, a non-random
    // conversationId opens replay-of-legitimate-completion windows
    // (e.g. replay of an old SUCCESS callback whose timestamp the
    // attacker can guess).  Switch to a crypto-secure random suffix
    // — UUID equivalent, opaque to anyone without DB read access.
    const conversationId = `nebula-${crypto.randomUUID()}`;

    // BLOCKER fix — see createStripePaymentIntent above for the
    // fulfillment-snapshot rationale.
    const spec = await this.resolveFulfillmentSpec(dto.itemSku, dto.passCode);

    const transaction = await this.transactionRepository.save(
      this.transactionRepository.create({
        userId,
        transactionType: dto.passCode ? 'purchase_premium_pass' : 'purchase_item',
        status: 'pending',
        provider: 'iyzico',
        shopItemId: spec.shopItemId,
        premiumPassId: spec.premiumPassId,
        itemSku: spec.itemSku,
        passCode: spec.passCode,
        quantity: spec.quantity,
        nebulaCoinsDelta: spec.nebulaCoinsDelta,
        premiumGemsDelta: spec.premiumGemsDelta,
        voidCrystalsDelta: spec.voidCrystalsDelta,
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

    // BLOCKER fix — see createStripePaymentIntent above.  Web-wallet
    // mock-complete (PAYMENT_MOCK_ENABLED) runs through the same
    // completeTransaction pipeline, so it MUST persist the same
    // fulfillment snapshot.
    const spec = await this.resolveFulfillmentSpec(dto.itemSku, dto.passCode);

    const transaction = await this.transactionRepository.save(
      this.transactionRepository.create({
        userId,
        transactionType: dto.passCode ? 'purchase_premium_pass' : 'purchase_item',
        status: 'pending',
        provider: dto.provider,
        shopItemId: spec.shopItemId,
        premiumPassId: spec.premiumPassId,
        itemSku: spec.itemSku,
        passCode: spec.passCode,
        quantity: spec.quantity,
        nebulaCoinsDelta: spec.nebulaCoinsDelta,
        premiumGemsDelta: spec.premiumGemsDelta,
        voidCrystalsDelta: spec.voidCrystalsDelta,
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
      // Pass `em` so completeTransaction reuses our connection /
      // transaction instead of opening a fresh one — otherwise the
      // inner UPDATE would deadlock against the FOR UPDATE lock we
      // just took above.
      await this.completeTransaction(tx.id, `mock_${tx.id}`, em);
    });

    return (await this.transactionRepository.findOne({ where: { id: transactionId } }))!;
  }

  // ==========================================
  // Stripe Webhook Handler
  // ==========================================

  /**
   * Handle a Stripe webhook delivery.  Verify-FIRST contract: the
   * `stripe.webhooks.constructEvent` call throws on signature
   * mismatch BEFORE any webhook_event INSERT, so a forged callback
   * cannot pre-poison the `(provider='stripe', eventId)` UNIQUE
   * index.  This is the same contract enforced manually on the
   * iyzico path (see `handleIyzicoCallback` JSDoc, C13-AUDIT-03).
   *
   * Stripe's `eventId` is upstream-deterministic by design
   * (`evt_...`), so once a verified event is persisted the UNIQUE
   * constraint correctly serves as the replay defense for legitimate
   * Stripe redeliveries.
   */
  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<Record<string, unknown>> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET ortam değişkeni eksik');
    }

    let eventId = '';
    let eventType = '';
    let payload: Record<string, unknown> = {};

    // Verify-FIRST: `constructEvent` throws before we touch the DB,
    // so forged callbacks never reach the webhook_event INSERT below.
    // No pre-poison DoS on (provider, eventId).  Mirrors the iyzico
    // path's verify-first gate added in C13-AUDIT-03.
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
      const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      eventId = stripeEvent.id;
      eventType = stripeEvent.type;
      payload = stripeEvent as unknown as Record<string, unknown>;
    } catch (err) {
      // Audit trail breadcrumb — structured WARN with the signature
      // header fragment so ops can grep for forgery attempts.  No
      // webhook_event row persisted (parity with iyzico forgery path).
      const sigFragment = signature
        ? signature.substring(0, 16) + '…'
        : '(empty)';
      this.logger.warn(
        `Stripe webhook signature mismatch — refusing to fulfill (no row persisted): ` +
          `sigFragment=${sigFragment}`,
      );
      throw new UnauthorizedException('Stripe webhook imzası geçersiz');
    }

    const event = await this.webhookRepository.save(
      this.webhookRepository.create({
        provider: 'stripe',
        eventId,
        eventType,
        payload,
        signature,
        isVerified: true,
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
   * **Verify-FIRST contract** (HIGH fix — C13-AUDIT-03, audit cycle 13):
   *
   *   Prior revisions persisted the webhook_event row FIRST (with
   *   `isVerified=false` on bad signature) and only THEN checked the
   *   `isVerified` flag.  That ordering opened a **pre-poison DoS**:
   *
   *     1. Attacker POSTs a forged callback with
   *        `{paymentId:"pi_real_pending_42", paymentStatus:"SUCCESS",
   *         token:"<garbage>", conversationId:"<anything>"}`.
   *     2. The handler INSERTs a webhook_event row keyed on
   *        `(provider='iyzico', eventId='iyz-pi_real_pending_42')`
   *        with `isVerified=false`.
   *     3. Handler throws 401 — but the row stays committed (it was
   *        saved in its own statement, not inside the verification
   *        gate's transaction).
   *     4. Later, iyzico's LEGITIMATE callback for that same
   *        paymentId arrives.  Our deterministic eventId =
   *        `iyz-${paymentId}` collides with the poisoned row →
   *        Postgres 23505 → we hit the existing replay path → return
   *        `{received:true, duplicate:true}` with HTTP 200 → iyzico
   *        stops retrying → the legitimate transaction stays
   *        `pending` forever → the player paid, gets no goods, DoS.
   *
   *   The fix mirrors the Stripe path's "verify before any DB touch":
   *     a) Compute HMAC and check `isVerified` FIRST.
   *     b) On mismatch: structured warn log (conversationId,
   *        paymentId, masked token fragment) and throw 401 BEFORE
   *        any webhook_event INSERT.  No row persisted → no poisoning
   *        → legitimate callback can still INSERT cleanly later.
   *     c) Only on `isVerified===true` do we persist the
   *        webhook_event row and call `processIyzicoEvent`.
   *
   *   Trade-off: forgery attempts no longer leave a webhook_event
   *   breadcrumb in the DB.  Audit trail moves to the structured
   *   logger (grep `iyzico callback signature mismatch`).  Better
   *   than the alternative (forgeries DoS the legitimate path), and
   *   the log line carries every field a forensic analyst would want.
   *
   *   Predictable conversationId fix (audit cycle 6, still in place):
   *   `createIyzicoPayment` uses `nebula-${crypto.randomUUID()}` so an
   *   attacker can't guess a victim's conversationId — but the DoS
   *   above doesn't even depend on guessing it, only on knowing the
   *   victim's paymentId (which iyzico exposes via the redirect URL
   *   query string in the browser flow, observable to an MITM or to
   *   anyone who shoulders the URL).
   *
   * **Replay-safety contract** (cycle-5 BLOCKER ECON-PAY-IYZICO-EVENTID-REPLAY):
   *
   *   The webhook_event row's natural key is `(provider, eventId)` with a
   *   UNIQUE constraint at the DB level (see WebhookEvent entity).  For
   *   the constraint to actually defend against replays, `eventId` MUST
   *   be deterministic from the upstream event — same callback, same
   *   key, second INSERT → Postgres 23505 → we short-circuit before
   *   `processIyzicoEvent` ever calls `recordPurchaseAndUpgradeVip`.
   *
   *   The current contract:
   *     eventId = `iyz-${paymentId}`        (no timestamp, deterministic)
   *
   *   Stripe path is unaffected — it already uses Stripe's own event id
   *   (`stripeEvent.id`) which is upstream-deterministic by design AND
   *   already verifies-before-persisting via `constructEvent`.
   *
   *   With the verify-first ordering, ONLY genuine iyzico-signed
   *   callbacks reach the INSERT, so the UNIQUE constraint only fires
   *   on real iyzico redeliveries (5xx retries) — never on attacker
   *   forgeries.
   *
   * On replay (genuine iyzico redelivery) the response is
   * `{ received: true, duplicate: true }` with HTTP 200 so iyzico's
   * retry loop stops (anything else, including 409, makes them keep
   * retrying).
   *
   * **DEFERRED follow-up: IP allowlist for iyzico webhooks** — iyzico
   * publishes a known set of source IPs for their webhook delivery
   * infrastructure.  We should add a guard that rejects callbacks
   * from any other source IP at the controller layer.  Not done in
   * this fix because ops needs to confirm the current allowed IPs
   * with iyzico (their list changes occasionally).  Tracked as a
   * follow-up; the verify-first + crypto-secure conversationId +
   * @Throttle defenses cover us in the interim.
   */
  async handleIyzicoCallback(
    callbackData: IyzicoCallbackDto,
    rawBody: string,
  ): Promise<Record<string, unknown>> {
    const secretKey = process.env.IYZICO_SECRET_KEY;
    if (!secretKey) {
      throw new UnauthorizedException('IYZICO_SECRET_KEY ortam değişkeni eksik');
    }

    // ── Verify-FIRST gate (C13-AUDIT-03) ───────────────────────────
    // HMAC-SHA256 + constant-time comparison.  Runs BEFORE any
    // webhook_event INSERT so attacker forgeries can't pre-poison the
    // (provider, eventId) UNIQUE index and DoS the legitimate
    // callback that arrives later.
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

    if (!isVerified) {
      // Audit trail breadcrumb for ops — structured WARN with the
      // fields a forensic analyst would grep for.  We deliberately
      // log only a short prefix of the bogus token (NOT the full
      // value) so an accidental leak of legitimate iyzico tokens via
      // log forwarding doesn't expose them.  No webhook_event row is
      // persisted; this log line is the only audit artifact for
      // forgery attempts.
      const tokenFragment = receivedToken
        ? receivedToken.substring(0, 8) + '…'
        : '(empty)';
      this.logger.warn(
        `iyzico callback signature mismatch — refusing to fulfill (no row persisted): ` +
          `conversationId=${callbackData.conversationId} ` +
          `paymentId=${callbackData.paymentId} ` +
          `status=${callbackData.paymentStatus} ` +
          `tokenFragment=${tokenFragment}`,
      );
      // 401 mirrors the Stripe path (constructEvent throws Unauthorized
      // on signature failure) and signals iyzico's retry loop to stop
      // hammering us with the same bad token.  Most importantly: NO
      // webhook_event row is committed, so a future legitimate
      // callback for the same paymentId can still INSERT cleanly.
      throw new UnauthorizedException('iyzico callback imza doğrulanamadı');
    }

    // Deterministic dedup key — DO NOT add a timestamp or random suffix.
    // The UNIQUE(provider, eventId) index relies on this being stable
    // across iyzico's redelivery attempts.  See JSDoc above.
    const eventId = `iyz-${callbackData.paymentId}`;

    let event: WebhookEvent;
    try {
      // Now that the signature is verified, persist the row.  Only
      // genuine iyzico-signed callbacks reach this point, so the
      // UNIQUE(provider, eventId) collision below only fires on real
      // iyzico redeliveries (5xx retries) — never on forgeries.
      event = await this.webhookRepository.save(
        this.webhookRepository.create({
          provider: 'iyzico',
          eventId,
          eventType: `payment.${callbackData.paymentStatus}`,
          payload: callbackData as unknown as Record<string, unknown>,
          signature: callbackData.token ?? null,
          isVerified: true,
          isProcessed: false,
        }),
      );
    } catch (err: unknown) {
      // Replay path: another (identical, verified) callback for the
      // same paymentId already wrote the row.  We MUST NOT re-run
      // processIyzicoEvent — it would call completeTransaction →
      // recordPurchaseAndUpgradeVip a second time and inflate
      // cumulative spend → free VIP tier.
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
   * Finalise a pending transaction: flip status → 'completed', credit
   * the player's wallet + inventory for the SKU they paid for, AND
   * bump the VIP cumulative-spend ledger.
   *
   * BLOCKER fix — PAYMENT-COMPLETETX-NO-FULFILLMENT (audit cycle 6)
   * ─────────────────────────────────────────────────────────────────
   * Before this commit, completeTransaction did exactly two things:
   *   1. set status='completed' on the row, and
   *   2. call vipService.recordPurchaseAndUpgradeVip (which bumps
   *      cumulative_spend_usd and may upgrade VIP tier).
   *
   * Real-money purchases delivered NOTHING — no gems credited to
   * user_currency, no row inserted into user_inventory. createIntent
   * had been storing `shopItemId: null, premiumPassId: null` so by
   * webhook time there was no way to know what the player had paid
   * for.  An attacker who triggered a Stripe webhook would gain VIP
   * tier upgrades for $0.99 without receiving the gem pack — and a
   * legitimate buyer would be defrauded the same way.
   *
   * The fix has two halves:
   *
   *  a) `resolveFulfillmentSpec` (called at intent time) snapshots the
   *     shop_items / premium_passes payload onto the Transaction row
   *     (item_sku / pass_code / quantity / *_delta).  Catalog drift is
   *     safe: a price/content edit between intent and webhook can't
   *     change what gets delivered.
   *
   *  b) This method, on a fresh status flip, now reads those columns
   *     and credits user_currency + upserts user_inventory in the
   *     SAME atomic transaction as the status update.  Either the
   *     player gets the goods AND status=completed, or both roll back.
   *
   * IDEMPOTENCY CONTRACT (carry-over from audit cycle 6,
   * ECON-PAY-COMPLETETX-NO-IDEMPOTENCY)
   * ─────────────────────────────────────────────────────────────────
   * The atomic conditional UPDATE (WHERE status='pending') is layer 1:
   * two concurrent callers serialise on the row lock; only the first
   * matches and gets a RETURNING row.  The loser's UPDATE affects 0
   * rows and we bail — wallet/inventory credit is gated on the same
   * RETURNING row so it can't double-fire either.
   *
   * Layer 2 is the `vip_spend_ledger` UNIQUE(transaction_id) inside
   * `process_vip_spend` (migration 1779900000000).  When the SQL
   * function reports `already_credited=true` we ALSO skip the wallet
   * / inventory delivery — that means a Stripe webhook replay weeks
   * later finds the ledger row populated, the VIP path no-ops, AND
   * the fulfillment path no-ops (we read this from the function
   * result and short-circuit before touching user_currency).
   *
   * For belt-and-braces against a future caller that bypasses both
   * layers (admin tool that flips status back to pending and re-runs):
   * the wallet UPDATE is an additive delta keyed by user_id, and the
   * inventory insert is `ON CONFLICT (user_id, shop_item_id) DO UPDATE
   * SET quantity = quantity + EXCLUDED.quantity`.  Even on a layer-3
   * failure, the only damage is over-grant — never under-grant.
   *
   * One-shot per-transactionId is the canonical contract: callers may
   * invoke completeTransaction(tx.id, …) any number of times; only
   * the first call delivers goods + credits VIP.
   *
   * FULFILLMENT-SPEC SAFETY GUARD (audit cycle 12 — HIGH CYCLE12-01)
   * ─────────────────────────────────────────────────────────────────
   * Before flipping status='completed', we sanity-check that the row
   * actually has a fulfillment spec to deliver:
   *
   *   itemSku IS NOT NULL  OR  passCode IS NOT NULL
   *
   * If neither is set on a `purchase_*` transaction with amount > 0,
   * the row was minted before migration 1779915000000 added the
   * fulfillment columns (or by a future regression in create-intent
   * that forgot to populate them).  Without a spec, deliverPurchase
   * walks zero/null deltas → credits nothing → player paid but
   * receives no gems / coins / inventory / pass, while VIP cumulative
   * spend gets bumped and status flips to 'completed' anyway.  Net
   * effect: silent theft.
   *
   * The guard throws InternalServerErrorException BEFORE the atomic
   * UPDATE, so:
   *   - status stays 'pending' (tx is not flipped)
   *   - VIP ledger row is NOT inserted
   *   - the player's FE can retry via create-intent, which mints a
   *     fresh row WITH the spec populated
   *   - a structured WARN is logged (tx.id, tx.userId, amount) so ops
   *     can backfill / cancel the orphan in the DB.
   *
   * Mock-complete path (PAYMENT_MOCK_ENABLED) hits the same gate —
   * devs must drive purchases via the /payment create-intent endpoints
   * (which snapshot the spec) and NOT by hand-INSERTing transactions
   * rows.
   *
   * Paired one-shot cleanup: migration 1779920000000 cancels
   * stale pending rows older than 1 hour with no spec, so the
   * existing pre-cycle-12 backlog can't trickle a webhook into this
   * guard later.
   */
  private async completeTransaction(
    transactionId: string,
    providerPaymentId: string,
    existingEm?: import('typeorm').EntityManager,
  ): Promise<{ alreadyCompleted: boolean; transactionId: string } | void> {
    // Wrap status flip + wallet credit + inventory grant in ONE atomic
    // transaction.  The VIP credit (which talks to its own
    // vip_spend_ledger) runs INSIDE the same tx — Postgres serialises
    // on the transactions row lock acquired by the conditional UPDATE,
    // so concurrent callers are mutually excluded.
    //
    // When called from mockCompleteTransaction (which already holds a
    // pessimistic_write lock on the row via an outer transaction), we
    // MUST reuse the caller's EntityManager — otherwise this method
    // would grab a fresh pool connection and deadlock on the outer
    // tx's FOR UPDATE.  `existingEm` is that hook.
    const runDelivery = async (em: import('typeorm').EntityManager) => {
      // ── Fulfillment-spec safety guard (audit cycle 12 — HIGH CYCLE12-01)
      //
      // Pre-flight check before any state mutation.  A purchase
      // transaction with status='pending', amount > 0, and BOTH
      // itemSku AND passCode NULL is malformed: it predates the
      // 1779915000000 fulfillment migration (orphaned in the DB) or
      // a future create-intent regression dropped the spec.  Either
      // way, completing it would credit VIP cumulative_spend, flip
      // status to 'completed', and deliver nothing — silent theft.
      //
      // We read the row OUTSIDE the row lock (no UPDATE yet) and
      // throw before touching state.  Status stays 'pending'; the
      // player's FE can retry via create-intent (which mints a fresh
      // row WITH the spec).  Ops sees a structured warn log they can
      // act on (backfill the columns by hand, or cancel the row).
      //
      // The check is intentionally permissive on non-purchase rows
      // (refunds, admin grants — transactionType doesn't start with
      // 'purchase_') and on zero-amount rows (free grants, promo
      // codes) so we don't break legitimate flows.
      const preflightTx = await em.findOne(Transaction, {
        where: { id: transactionId },
      });
      if (
        preflightTx &&
        preflightTx.status === 'pending' &&
        preflightTx.transactionType?.startsWith('purchase_') &&
        !preflightTx.itemSku &&
        !preflightTx.passCode &&
        ((preflightTx.amountUsd !== null && Number(preflightTx.amountUsd) > 0) ||
          (preflightTx.amountTry !== null && Number(preflightTx.amountTry) > 0))
      ) {
        this.logger.warn(
          `completeTransaction: fulfillment-spec eksik — teslimat reddedildi.` +
            ` txn=${preflightTx.id} userId=${preflightTx.userId}` +
            ` amountUsd=${preflightTx.amountUsd} amountTry=${preflightTx.amountTry}` +
            ` transactionType=${preflightTx.transactionType}` +
            ` provider=${preflightTx.provider}` +
            ` createdAt=${preflightTx.createdAt?.toISOString?.() ?? preflightTx.createdAt}` +
            ` — Ops: backfill item_sku/pass_code via create-intent veya iptal et.`,
        );
        throw new InternalServerErrorException(
          'Tx fulfillment spec missing — cannot deliver. Ops: backfill or cancel.',
        );
      }

      // Layer 1: race-safe idempotency guard. Atomic conditional UPDATE
      // — the WHERE clause filters status='pending', so two concurrent
      // callers serialise on the row lock; only the first one matches
      // and gets a RETURNING row.  The loser's UPDATE affects 0 rows
      // and we bail.
      const updated = await em.query<
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
        // (still inside the tx so the read sees the same snapshot) to
        // decide which.
        const tx = await em.findOne(Transaction, {
          where: { id: transactionId },
        });
        if (!tx) {
          this.logger.warn(`completeTransaction: tx bulunamadı: ${transactionId}`);
          return { alreadyCompleted: false as const, didFlip: false as const };
        }
        this.logger.log(
          `completeTransaction: yinelenen tamamlama atlandı (status=${tx.status}): txn=${transactionId}`,
        );
        return { alreadyCompleted: true as const, didFlip: false as const };
      }

      // We hold the "first completer" claim on this row. Re-read the
      // full entity for the delivery payload (item_sku, deltas, etc.)
      const tx = await em.findOne(Transaction, {
        where: { id: transactionId },
      });
      if (!tx) {
        // Should never happen — we just UPDATE-RETURNING'd this row.
        this.logger.error(
          `completeTransaction: post-update lookup boş: ${transactionId}`,
        );
        return { alreadyCompleted: false as const, didFlip: false as const };
      }

      // ── VIP cumulative-spend credit + idempotency check ──────────
      // Run FIRST so we can use its `already_credited` signal to gate
      // the wallet/inventory delivery (layer 2).  Inside the same tx
      // so a delivery failure rolls back the VIP ledger row too.
      let vipAlreadyCredited = false;
      try {
        // Pass `em` so the VIP ledger INSERT participates in our
        // atomic transaction.  If a downstream wallet/inventory write
        // fails and we throw, the VIP ledger row rolls back too —
        // closing the "VIP credited but goods undelivered" window
        // that opened in the prior implementation (separate
        // connection, independent commit).
        const vipResult = await this.vipService.recordPurchaseAndUpgradeVip({
          userId: tx.userId,
          transactionId: tx.id,
          amountUsd: tx.amountUsd,
          amountTry: tx.amountTry,
          currencyCode: tx.currencyCode,
          purchaseType: tx.transactionType,
          countryCode: tx.countryCode,
        }, em);

        if (vipResult.upgraded) {
          this.logger.log(
            `VIP yükseltme sonrası bildirim gönderilecek: kullanıcı=${tx.userId} VIP${vipResult.oldVipLevel}→VIP${vipResult.newVipLevel}`,
          );
        }
        // Ground truth from the SQL function's already_credited flag.
        // VipService surfaces it on the result so we can gate the
        // wallet/inventory delivery without a second roundtrip.
        vipAlreadyCredited = Boolean(vipResult.alreadyCredited);
      } catch (err: unknown) {
        if (
          err instanceof QueryFailedError &&
          (err as { code?: string }).code === '23505'
        ) {
          this.logger.warn(
            `completeTransaction: VIP ledger duplicate caught (layer-2): txn=${transactionId}`,
          );
          vipAlreadyCredited = true;
        } else {
          throw err;
        }
      }

      this.logger.log(`Ödeme tamamlandı: txn=${transactionId}`);

      if (vipAlreadyCredited) {
        // Replay path — VIP ledger already had this txn_id.  We MUST
        // NOT re-credit wallet/inventory either, otherwise a Stripe
        // resend after 30 days would silently double-deliver.
        this.logger.warn(
          `completeTransaction: fulfillment atlandı (VIP ledger replay): txn=${transactionId}`,
        );
        return { alreadyCompleted: false as const, didFlip: true as const };
      }

      // ── Fulfillment delivery ──────────────────────────────────────
      // Read the snapshotted spec from the transaction row itself
      // (NOT the live catalog) so catalog drift doesn't affect what
      // gets delivered.  When itemSku/passCode are null (pre-fix
      // historical rows, or paths that haven't been migrated yet) we
      // skip silently — the delta columns default to 0 so the wallet
      // UPDATE is a no-op anyway.
      await this.deliverPurchase(em, tx);

      return { alreadyCompleted: false as const, didFlip: true as const };
    };

    // Reuse the caller's transaction when one was passed in (avoids
    // deadlocking on the outer FOR UPDATE lock held by
    // mockCompleteTransaction).  Otherwise open our own.
    const deliveryResult = existingEm
      ? await runDelivery(existingEm)
      : await this.dataSource.transaction(runDelivery);

    if (deliveryResult.alreadyCompleted) {
      return { alreadyCompleted: true, transactionId };
    }
  }

  /**
   * Credit the player's wallet (user_currency) and grant any
   * catalog-tracked items (user_inventory) for a freshly-completed
   * transaction.
   *
   * Runs INSIDE the calling completeTransaction's atomic transaction
   * (`em` is the locked entity manager).  Mirrors the credit pattern
   * from `ShopService.purchaseWithInGameCurrency` (which already
   * handles the in-game-currency variant) so the two paths produce
   * identical wallet / inventory state for the same SKU.
   *
   * Triple safety net:
   *   - Wallet INSERT uses `ON CONFLICT (user_id) DO NOTHING` so the
   *     row is lazy-created.
   *   - Wallet UPDATE is additive (delta-based) so concurrent paths
   *     can't lose grants.
   *   - Inventory UPSERT uses `ON CONFLICT (user_id, shop_item_id) DO
   *     UPDATE SET quantity = ... + EXCLUDED.quantity` so the unique
   *     index doubles as the dedup anchor.
   */
  private async deliverPurchase(
    em: import('typeorm').EntityManager,
    tx: Transaction,
  ): Promise<void> {
    const gemDelta = Number(tx.premiumGemsDelta ?? 0) * Math.max(1, Number(tx.quantity ?? 1));
    const coinDelta = Number(tx.nebulaCoinsDelta ?? 0) * Math.max(1, Number(tx.quantity ?? 1));
    const voidDelta = Number(tx.voidCrystalsDelta ?? 0) * Math.max(1, Number(tx.quantity ?? 1));

    // Wallet credit — single statement so the UPSERT path can't lose a
    // grant to a concurrent UPDATE on the same row.
    if (gemDelta > 0 || coinDelta > 0 || voidDelta > 0) {
      await em.query(
        `INSERT INTO user_currency (user_id, premium_gems, nebula_coins, void_crystals)
           VALUES ($1::uuid, $2, $3, $4)
           ON CONFLICT (user_id) DO UPDATE
              SET premium_gems  = user_currency.premium_gems  + EXCLUDED.premium_gems,
                  nebula_coins  = user_currency.nebula_coins  + EXCLUDED.nebula_coins,
                  void_crystals = user_currency.void_crystals + EXCLUDED.void_crystals,
                  updated_at    = NOW()`,
        [tx.userId, gemDelta, coinDelta, voidDelta],
      );
      this.logger.log(
        `Cüzdan kredisi: kullanıcı=${tx.userId} txn=${tx.id} gems=+${gemDelta} coins=+${coinDelta} void=+${voidDelta}`,
      );
    }

    // Inventory grant for shop SKUs (premium_passes have a separate
    // grant path via VipService).  We resolve item_sku → shop_items.id
    // inside the same tx and upsert user_inventory.
    if (tx.itemSku) {
      const itemRows = (await em.query(
        `SELECT id, content FROM shop_items WHERE sku = $1::varchar`,
        [tx.itemSku],
      )) as Array<{ id: string; content: Record<string, unknown> | null }>;
      if (itemRows.length === 0) {
        this.logger.warn(
          `deliverPurchase: shop_items lookup boş (sku=${tx.itemSku}): txn=${tx.id} — envanter atlandı`,
        );
      } else {
        const shopItemId = itemRows[0].id;
        const qty = Math.max(1, Number(tx.quantity ?? 1));
        await em.query(
          `INSERT INTO user_inventory (user_id, shop_item_id, quantity, source, acquired_at)
             VALUES ($1::uuid, $2::uuid, $3, 'purchase', NOW())
             ON CONFLICT (user_id, shop_item_id) DO UPDATE
                SET quantity = user_inventory.quantity + EXCLUDED.quantity`,
          [tx.userId, shopItemId, qty],
        );
        this.logger.log(
          `Envanter eklendi: kullanıcı=${tx.userId} sku=${tx.itemSku} miktar=+${qty} txn=${tx.id}`,
        );
      }
    }

    // Premium pass delivery.  VIP tier upgrade is already handled by
    // recordPurchaseAndUpgradeVip (called above) — that bumps the
    // tier when cumulative_spend_usd crosses a threshold.  Here we
    // also activate the user_premium_passes row so the player gets
    // the pass-specific entitlement window (duration_days) on top of
    // any VIP tier benefit.
    //
    // Replay safety: the layer-2 vip_spend_ledger UNIQUE(transaction_id)
    // guard above already short-circuits this whole block on Stripe
    // webhook resend.  As an extra belt-and-braces against an admin
    // tool re-running completion: we check for an existing active
    // pass for this user+passId before inserting, so the worst case is
    // a no-op (never a double activation).
    if (tx.passCode) {
      const passRows = (await em.query(
        `SELECT id, duration_days FROM premium_passes WHERE code = $1::varchar`,
        [tx.passCode],
      )) as Array<{ id: string; duration_days: number }>;
      if (passRows.length === 0) {
        this.logger.warn(
          `deliverPurchase: premium_passes lookup boş (code=${tx.passCode}): txn=${tx.id}`,
        );
      } else {
        const passId = passRows[0].id;
        const durationDays = Number(passRows[0].duration_days);
        // user_premium_passes has no transaction_id column today —
        // dedup by "is there already an active row for this user+pass
        // that hasn't expired and was created after the tx row?".
        // The outer vip_spend_ledger guard is the primary defence;
        // this is just to keep an admin-driven re-grant from layering
        // a second active subscription on top of the existing one.
        await em.query(
          `INSERT INTO user_premium_passes
             (user_id, premium_pass_id, status, started_at, expires_at, payment_provider)
           SELECT $1::uuid, $2::uuid, 'active', NOW(),
                  NOW() + ($3 || ' days')::interval, $4
            WHERE NOT EXISTS (
              SELECT 1 FROM user_premium_passes
               WHERE user_id = $1::uuid
                 AND premium_pass_id = $2::uuid
                 AND status = 'active'
                 AND expires_at > NOW()
            )`,
          [tx.userId, passId, String(durationDays), tx.provider ?? 'stripe'],
        );
        this.logger.log(
          `Premium pass aktive: kullanıcı=${tx.userId} pass=${tx.passCode} süre=${durationDays}d txn=${tx.id}`,
        );
      }
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

  /**
   * Snapshot the catalog entry the player is paying for, so the
   * downstream webhook handler (completeTransaction → deliverPurchase)
   * has everything it needs to credit wallet + inventory without
   * re-reading the (mutable) catalog.
   *
   * Lookup order:
   *  1. shop_items by SKU — preferred, gives us shop_items.id +
   *     parsed content (premium_gems / nebula_coins grants).
   *  2. premium_passes by code — for passCode purchases.
   *  3. Legacy in-memory gem-pack map (gems_100 ..) — kept alive so
   *     payment-test flows that predate the seed migration still mint
   *     a transaction.  Deltas come from the SKU suffix; quantity is 1.
   *
   * Catalog-drift safety: this runs at INTENT TIME, the result is
   * persisted onto the transactions row.  The webhook reads from the
   * row, not the live catalog, so a later edit to shop_items.content
   * doesn't change what gets delivered.
   */
  private async resolveFulfillmentSpec(
    itemSku?: string,
    passCode?: string,
  ): Promise<FulfillmentSpec> {
    const spec: FulfillmentSpec = {
      itemSku: itemSku ?? null,
      passCode: passCode ?? null,
      shopItemId: null,
      premiumPassId: null,
      quantity: 1,
      nebulaCoinsDelta: 0,
      premiumGemsDelta: 0,
      voidCrystalsDelta: 0,
    };

    if (itemSku) {
      // Try catalog first.
      const rows = (await this.dataSource.query(
        `SELECT id, content FROM shop_items WHERE sku = $1::varchar`,
        [itemSku],
      )) as Array<{ id: string; content: Record<string, unknown> | null }>;

      if (rows.length > 0) {
        spec.shopItemId = rows[0].id;
        const content = rows[0].content ?? {};
        // shop_items.content schema (see SeedShopProductSkus migration):
        //   { premium_gems: N, bonus_gems: N, nebula_coins: N, ... }
        const gems = Number(content['premium_gems'] ?? 0);
        const bonusGems = Number(content['bonus_gems'] ?? 0);
        const coins = Number(content['nebula_coins'] ?? 0);
        const voids = Number(content['void_crystals'] ?? 0);
        spec.premiumGemsDelta = (Number.isFinite(gems) ? gems : 0) + (Number.isFinite(bonusGems) ? bonusGems : 0);
        spec.nebulaCoinsDelta = Number.isFinite(coins) ? coins : 0;
        spec.voidCrystalsDelta = Number.isFinite(voids) ? voids : 0;
        return spec;
      }

      // Fallback: legacy gems_N SKUs not in the seeded catalog.  Parse
      // the N suffix.  Keeps the test flow alive for callers that hit
      // /payment/stripe/create-intent before the FE shop is wired.
      const legacyMatch = /^gems_(\d+)$/.exec(itemSku);
      if (legacyMatch) {
        spec.premiumGemsDelta = Number(legacyMatch[1]);
        return spec;
      }
    }

    if (passCode) {
      const rows = (await this.dataSource.query(
        `SELECT id, rewards FROM premium_passes WHERE code = $1::varchar`,
        [passCode],
      )) as Array<{ id: string; rewards: Record<string, unknown> | null }>;
      if (rows.length > 0) {
        spec.premiumPassId = rows[0].id;
        const rewards = rows[0].rewards ?? {};
        const gems = Number(rewards['premium_gems'] ?? 0);
        const coins = Number(rewards['nebula_coins'] ?? 0);
        spec.premiumGemsDelta = Number.isFinite(gems) ? gems : 0;
        spec.nebulaCoinsDelta = Number.isFinite(coins) ? coins : 0;
        return spec;
      }
    }

    // Unknown SKU/code — return the zeroed spec.  resolveAmount runs
    // before this call and would have thrown BadRequestException if
    // the SKU was truly unknown; reaching here just means the SKU
    // exists in the legacy price map but has no catalog row.  The
    // webhook will skip wallet credit (deltas are 0) and skip
    // inventory grant (itemSku snapshot is preserved but shop_items
    // lookup will return empty).
    return spec;
  }

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
