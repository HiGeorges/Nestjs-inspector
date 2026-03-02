import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { TelescopeService } from './telescope.service';
import { Reflector } from '@nestjs/core';
import { TELESCOPE_SKIP_KEY } from './decorators/skip-telescope.decorator';
import { TELESCOPE_OPTIONS } from './telescope.constants';
import { TelescopeModuleOptions } from './interfaces/telescope-options.interface';

@Injectable()
export class TelescopeInterceptor implements NestInterceptor {
  private readonly routePrefix: string;
  private reflector: Reflector;

  constructor(
    private readonly telescopeService: TelescopeService,
    @Inject(TELESCOPE_OPTIONS)
    private readonly options: TelescopeModuleOptions,
  ) {
    this.routePrefix = options.routePrefix ?? 'telescope';
    this.reflector = new Reflector();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.telescopeService.isEnabled()) {
      return next.handle();
    }

    // Check if route is marked to skip inspection
    const skipTelescope = this.reflector.getAllAndOverride<boolean>(
      TELESCOPE_SKIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTelescope) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Skip telescope's own endpoints to avoid recursion
    if (request.path.includes(`/${this.routePrefix}`)) {
      return next.handle();
    }

    // Check if path should be excluded
    if (this.telescopeService.shouldExcludePath(request.path)) {
      return next.handle();
    }

    const sanitizedHeaders = this.sanitizeHeaders(
      request.headers as Record<string, string>,
    );
    const sanitizedBody = this.sanitizeBody(request.body);

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.telescopeService.record({
          timestamp: new Date(),
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          duration,
          ip: this.getClientIp(request),
          userAgent: request.headers['user-agent'] || 'unknown',
          userId: (request as Request & { user?: { id: string } }).user?.id,
          query: request.query as Record<string, unknown>,
          body: sanitizedBody,
          headers: sanitizedHeaders,
          response: {
            success: true,
            data: this.truncateResponse(data),
          },
        });
      }),
      catchError((error: Error | HttpException) => {
        const duration = Date.now() - startTime;
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        this.telescopeService.record({
          timestamp: new Date(),
          method: request.method,
          path: request.path,
          statusCode,
          duration,
          ip: this.getClientIp(request),
          userAgent: request.headers['user-agent'] || 'unknown',
          userId: (request as Request & { user?: { id: string } }).user?.id,
          query: request.query as Record<string, unknown>,
          body: sanitizedBody,
          headers: sanitizedHeaders,
          response: {
            success: false,
            error: errorMessage,
          },
        });
        throw error;
      }),
    );
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const sensitiveHeaders = this.telescopeService.getSensitiveHeaders();
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  private sanitizeBody(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== 'object') {
      return {};
    }

    const sensitiveFields = this.telescopeService.getSensitiveBodyFields();
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(
      body as Record<string, unknown>,
    )) {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private truncateResponse(data: unknown): unknown {
    const maxLength = this.telescopeService.getResponseBodyMaxLength();
    const stringified = JSON.stringify(data);

    if (stringified.length > maxLength) {
      return {
        _truncated: true,
        _preview: stringified.substring(0, maxLength) + '...',
      };
    }

    return data;
  }
}
