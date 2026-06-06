import { Injectable, HttpException, HttpStatus, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom ThrottlerGuard that surfaces a Turkish-language 429 body matching
 * the rest of the API's error responses. Falls back to default headers /
 * tracker behaviour from upstream ThrottlerGuard.
 *
 * Body shape:
 *   { statusCode: 429, message: "Çok fazla istek — biraz sonra tekrar dene" }
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(_context: ExecutionContext): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Çok fazla istek — biraz sonra tekrar dene',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// Re-export to keep import surface tiny for consumers that only need the type.
export { ThrottlerException };
