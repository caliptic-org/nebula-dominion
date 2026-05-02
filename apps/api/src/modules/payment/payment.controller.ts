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

@ApiTags('Payment')
@Controller('api/v1/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ------------------------------------------
  // Stripe
  // ------------------------------------------

  @Post('stripe/create-intent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stripe ödeme niyeti oluştur (USD veya diğer)' })
  createStripeIntent(
    @Body()
    body: {
      itemSku?: string;
      passCode?: string;
      currencyCode: 'USD' | 'TRY';
    },
    @Req() req: Request & { ip: string; headers: Record<string, string> },
  ) {
    const userId = 'demo-user-id';
    return this.paymentService.createStripePaymentIntent(userId, {
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'iyzico ödeme formu oluştur (TRY - Türkiye)' })
  createIyzicoPayment(
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
    const userId = 'demo-user-id';
    return this.paymentService.createIyzicoPayment(userId, {
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
  // İşlem Geçmişi
  // ------------------------------------------

  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcı ödeme geçmişi' })
  getTransactions() {
    const userId = 'demo-user-id';
    return this.paymentService.getUserTransactions(userId);
  }

  // ------------------------------------------
  // KVKK / GDPR
  // ------------------------------------------

  @Post('consent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'KVKK onay kaydet (açık rıza)' })
  recordConsent(
    @Body()
    body: {
      consentType: string;
      granted: boolean;
      version?: string;
    },
    @Req() req: Request & { ip: string; headers: Record<string, string> },
  ) {
    const userId = 'demo-user-id';
    return this.paymentService.recordConsent(
      userId,
      body.consentType,
      body.granted,
      req.ip,
      req.headers['user-agent'],
      body.version,
    );
  }

  @Get('consents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcının KVKK onay geçmişi' })
  getConsents() {
    const userId = 'demo-user-id';
    return this.paymentService.getUserConsents(userId);
  }

  @Post('gdpr/revoke-all-consents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'GDPR/KVKK - Tüm onayları geri al' })
  revokeAllConsents(
    @Req() req: Request & { ip: string },
  ) {
    const userId = 'demo-user-id';
    return this.paymentService.revokeAllConsents(userId, req.ip);
  }

  @Post('gdpr/anonymize')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'GDPR/KVKK - Ödeme verilerini anonimleştir (unutulma hakkı)' })
  anonymizeData() {
    const userId = 'demo-user-id';
    return this.paymentService.anonymizeUserPaymentData(userId);
  }
}
