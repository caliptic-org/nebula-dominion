import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrackConversionDto } from './dto/track-conversion.dto';

/**
 * Forwards conversion events to GA4 Measurement Protocol.
 *
 * MP endpoint: https://www.google-analytics.com/mp/collect
 *   ?measurement_id=G-XXXXXXX
 *   &api_secret=<from GA4 admin → data stream → measurement protocol api secrets>
 *
 * Payload spec: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 *
 * When `GA4_API_SECRET` env is empty we no-op silently — handy for local dev
 * + PR previews where you don't want test events polluting prod reports.
 */
@Injectable()
export class ConversionsService {
  private readonly logger = new Logger(ConversionsService.name);

  constructor(private readonly config: ConfigService) {}

  async trackToGa4(dto: TrackConversionDto): Promise<void> {
    const measurementId = this.config.get<string>('GA4_MEASUREMENT_ID');
    const apiSecret = this.config.get<string>('GA4_API_SECRET');

    if (!measurementId || !apiSecret) {
      // Not configured — silently drop. The browser's gtag.js still fires
      // its own client-side hit, so the conversion isn't actually lost.
      return;
    }

    // GA4 requires a `client_id` per hit. If the client didn't pass one
    // (cookie blocked / first visit), fabricate a synthetic id derived from
    // the userId or a random fallback. Synthetic ids won't stitch with
    // browser sessions but they keep the event from being rejected.
    const clientId =
      dto.clientId ?? (dto.userId ? `synthetic.${dto.userId}` : `anonymous.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`);

    const eventParams: Record<string, string | number> = {};
    if (dto.value !== undefined) eventParams.value = dto.value;
    if (dto.currency) eventParams.currency = dto.currency;
    if (dto.race) eventParams.race = dto.race;
    if (dto.level !== undefined) eventParams.level = dto.level;
    if (dto.gclid) eventParams.gclid = dto.gclid;
    if (dto.fbclid) eventParams.fbclid = dto.fbclid;
    if (dto.msclkid) eventParams.msclkid = dto.msclkid;
    if (dto.ttclid) eventParams.ttclid = dto.ttclid;
    // Server-side tag so we can distinguish backend hits from client gtag
    // hits in BigQuery / DebugView. Otherwise we double-count.
    eventParams.source = 'server';

    const body: Record<string, unknown> = {
      client_id: clientId,
      events: [
        {
          name: dto.eventName,
          params: eventParams,
        },
      ],
    };

    if (dto.userId) {
      body.user_id = dto.userId;
    }

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

    // Use the global fetch (Node 22 has it built-in). Timeout via AbortController
    // so a flaky GA endpoint doesn't hang request handlers.
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      // MP returns 204 on success. 2xx is fine, anything else is a misconfig
      // we want to know about in logs.
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`GA4 MP non-2xx for ${dto.eventName}: ${res.status} ${text.slice(0, 200)}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
