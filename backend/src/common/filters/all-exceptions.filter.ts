import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { AnalyticsService } from '../../analytics/analytics.service';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly analytics: AnalyticsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    if (status >= 500) {
      const errorMessage =
        exception instanceof Error ? exception.message : String(exception);
      const stack =
        exception instanceof Error
          ? (exception.stack ?? '').substring(0, 2000)
          : undefined;

      this.logger.error(
        `Unhandled ${status} on ${request.method} ${request.path}: ${errorMessage}`,
        stack,
      );

      void this.analytics.trackServer({
        event_type: 'error.crash',
        user_id: (request as any)?.user?.id ?? 'anonymous',
        session_id:
          (request.headers['x-session-id'] as string | undefined) ?? 'server',
        properties: {
          error_type:
            exception instanceof Error
              ? exception.constructor.name
              : 'UnknownError',
          message: errorMessage,
          path: request.path,
          method: request.method,
          status_code: status,
          stack,
        },
      });

      if (process.env.SENTRY_DSN) {
        Sentry.captureException(exception);
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
