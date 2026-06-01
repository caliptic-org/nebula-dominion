import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  RawBodyRequest,
  Req,
  Request,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payment')
// Global prefix `api/v1` is set in main.ts; declaring it here too produced
// /api/v1/api/v1/payment/* mounts that were unreachable from the FE.
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ------------------------------------------
  // Stripe
  // ------------------------------------------

  @Post('stripe/create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stripe ödeme niyeti oluştur (USD veya diğer)' })
  createStripeIntent(
    @CurrentUser() currentUserId: string,
    @Body()
    body: {
      itemSku?: string;
      passCode?: string;
      currencyCode: 'USD' | 'TRY';
    },
    @Req() req: Request & { ip: string; headers: Record<string, string> },
  ) {
    return this.paymentService.createStripePaymentIntent(currentUserId, {
      ...body,
      provider: 'stripe',
      userIp: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('stripe/webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      return { error: 'rawBody eksik' };
    }
    return this.paymentService.handleStripeWebhook(req.rawBody, signature);
  }

  // ------------------------------------------
  // iyzico (Türkiye)
  // ------------------------------------------

  @Post('iyzico/create-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'iyzico ödeme formu oluştur (TRY - Türkiye)' })
  createIyzicoPayment(
    @CurrentUser() currentUserId: string,
    @Body()
    body: {
      itemSku?: string;
      passCode?: string;
      buyerEmail: string;
      buyerName: string;
      buyerSurname: string;
      buyerPhone?: string;
      buyerCity?: string;
    },
    @Req() req: Request & { ip: string; headers: Record<string, string> },
  ) {
    return this.paymentService.createIyzicoPayment(currentUserId, {
      ...body,
      currencyCode: 'TRY',
      provider: 'iyzico',
      userIp: req.ip,
      userAgent: req.headers['user-agent'],
      countryCode: 'TR',
    });
  }

  @Post('iyzico/callback')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async iyzicoCallback(
    @Body()
    body: {
      conversationId: string;
      paymentStatus: string;
      paymentId: string;
      token?: string;
    },
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    return this.paymentService.handleIyzicoCallback(body, rawBody);
  }

  // ------------------------------------------
  // Web Wallet (Google Pay / Apple Pay)
  // ------------------------------------------
  // Front-end flow for non-mobile Nebula:
  //   1. POST /payment/web/create-payment with {provider, itemSku|passCode}
  //   2. FE renders Google Pay JS / Apple Pay JS button (uses sessionToken
  //      as the PaymentRequest API client secret in production).
  //   3. User completes the wallet sheet → FE confirms via
  //      POST /payment/mock/complete (playtest) or via real provider
  //      webhook (production).
  // Both wallets route the underlying card through Stripe in production;
  // the controller stays provider-agnostic so the same FE path serves
  // both GPay and ApplePay without branching.

  @Post('web/create-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Google Pay / Apple Pay ödeme oturumu oluştur' })
  createWebPayment(
    @CurrentUser() currentUserId: string,
    @Body()
    body: {
      itemSku?: string;
      passCode?: string;
      provider: 'google_pay' | 'apple_pay';
      currencyCode?: 'USD' | 'TRY';
    },
    @Req() req: Request & { ip: string; headers: Record<string, string> },
  ) {
    return this.paymentService.createWebPayment(currentUserId, {
      itemSku: body.itemSku,
      passCode: body.passCode,
      currencyCode: body.currencyCode ?? 'USD',
      provider: body.provider,
      userIp: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('mock/complete/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Playtest] Bekleyen ödemeyi tamamla (gerçek webhook yerine)',
    description:
      'PAYMENT_MOCK_ENABLED env true (veya non-production) iken çalışır. Production'
      + ' webhook hattı kurulduktan sonra disable et: PAYMENT_MOCK_ENABLED=false',
  })
  @ApiParam({ name: 'transactionId', description: 'Bekleyen işlem UUID' })
  mockComplete(
    @CurrentUser() currentUserId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.paymentService.mockCompleteTransaction(currentUserId, transactionId);
  }

  // ------------------------------------------
  // İşlem Geçmişi
  // ------------------------------------------

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcı ödeme geçmişi' })
  getTransactions(@CurrentUser() currentUserId: string) {
    return this.paymentService.getUserTransactions(currentUserId);
  }

  // ------------------------------------------
  // KVKK / GDPR
  // ------------------------------------------

  @Post('consent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'KVKK onay kaydet (açık rıza)' })
  recordConsent(
    @CurrentUser() currentUserId: string,
    @Body()
    body: {
      consentType: string;
      granted: boolean;
      version?: string;
    },
    @Req() req: Request & { ip: string; headers: Record<string, string> },
  ) {
    return this.paymentService.recordConsent(
      currentUserId,
      body.consentType,
      body.granted,
      req.ip,
      req.headers['user-agent'],
      body.version,
    );
  }

  @Get('consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcının KVKK onay geçmişi' })
  getConsents(@CurrentUser() currentUserId: string) {
    return this.paymentService.getUserConsents(currentUserId);
  }

  @Post('gdpr/revoke-all-consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'GDPR/KVKK - Tüm onayları geri al' })
  revokeAllConsents(
    @CurrentUser() currentUserId: string,
    @Req() req: Request & { ip: string },
  ) {
    return this.paymentService.revokeAllConsents(currentUserId, req.ip);
  }

  @Post('gdpr/anonymize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'GDPR/KVKK - Ödeme verilerini anonimleştir (unutulma hakkı)' })
  anonymizeData(@CurrentUser() currentUserId: string) {
    return this.paymentService.anonymizeUserPaymentData(currentUserId);
  }
}
