import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConversionsService } from './conversions.service';
import { TrackConversionDto } from './dto/track-conversion.dto';

/**
 * Server-side conversion tracking.
 *
 * Endpoint exists primarily for browser environments where client-side
 * tracking is unreliable:
 *   - iOS 14.5+ App Tracking Transparency strips most ad IDs
 *   - Safari Intelligent Tracking Prevention caps `_ga` cookie to 7 days
 *   - Adblockers + privacy extensions block `gtag.js` outright
 *
 * When the browser fires a conversion (signup, purchase, level_up), it ALSO
 * pings this endpoint with the same payload. The backend forwards to GA4's
 * Measurement Protocol from its own IP, bypassing all client-side blockers.
 *
 * Auth: intentionally PUBLIC. Conversion events fire pre-auth (e.g. signup)
 * and we want them through even from guests. Rate-limit at the gateway if
 * abuse appears.
 */
@ApiTags('conversions')
@Controller('conversions')
export class ConversionsController {
  private readonly logger = new Logger(ConversionsController.name);

  constructor(private readonly svc: ConversionsService) {}

  @Post('track')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Server-side fire of an analytics conversion to GA4 Measurement Protocol' })
  async track(@Body() dto: TrackConversionDto): Promise<void> {
    try {
      await this.svc.trackToGa4(dto);
    } catch (err) {
      // We never throw to the client — conversion drops are silent. Better
      // to log + return 204 than to cascade an analytics failure into a
      // visible UX hiccup.
      this.logger.error(`GA4 forward failed for ${dto.eventName}`, err as Error);
    }
  }
}
