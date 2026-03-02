import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RequestEntry, TelescopeStats } from './interfaces/request-entry.interface';
import { TelescopeModuleOptions } from './interfaces/telescope-options.interface';
import { TELESCOPE_OPTIONS } from './telescope.constants';

interface GetAllOptions {
  limit?: number;
  offset?: number;
  method?: string;
  statusCode?: number;
  path?: string;
  minDuration?: number;
}

@Injectable()
export class TelescopeService implements OnModuleInit, OnModuleDestroy {
  private entries: Map<string, RequestEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly enabled: boolean;
  private readonly maxEntries: number;
  private readonly retentionMinutes: number;
  private readonly sensitiveHeaders: string[];
  private readonly sensitiveBodyFields: string[];
  private readonly excludePaths: string[];
  private readonly ignorePatterns: RegExp[];
  private readonly responseBodyMaxLength: number;

  constructor(
    @Inject(TELESCOPE_OPTIONS)
    private readonly options: TelescopeModuleOptions,
  ) {
    this.enabled = options.enabled ?? true;
    this.maxEntries = options.maxEntries ?? 1000;
    this.retentionMinutes = options.retentionMinutes ?? 60;
    this.sensitiveHeaders = options.sensitiveHeaders ?? [
      'authorization',
      'cookie',
      'x-api-key',
    ];
    this.sensitiveBodyFields = options.sensitiveBodyFields ?? [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
    ];
    this.excludePaths = options.excludePaths ?? [];
    this.ignorePatterns = options.ignorePatterns ?? [];
    this.responseBodyMaxLength = options.responseBodyMaxLength ?? 1000;
  }

  onModuleInit() {
    if (this.enabled) {
      // Clean up old entries periodically
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getOptions(): TelescopeModuleOptions {
    return this.options;
  }

  getSensitiveHeaders(): string[] {
    return this.sensitiveHeaders;
  }

  getSensitiveBodyFields(): string[] {
    return this.sensitiveBodyFields;
  }

  getResponseBodyMaxLength(): number {
    return this.responseBodyMaxLength;
  }

  shouldExcludePath(path: string): boolean {
    // Check exact matches
    if (this.excludePaths.includes(path)) {
      return true;
    }

    // Check regex patterns
    for (const pattern of this.ignorePatterns) {
      if (pattern.test(path)) {
        return true;
      }
    }

    return false;
  }

  record(entry: Omit<RequestEntry, 'id'>): RequestEntry | null {
    if (!this.enabled) return null;

    const id = randomUUID();
    const fullEntry: RequestEntry = { id, ...entry };

    // Remove oldest entries if limit reached
    if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (oldestKey) {
        this.entries.delete(oldestKey);
      }
    }

    this.entries.set(id, fullEntry);
    return fullEntry;
  }

  getAll(options: GetAllOptions = {}): {
    entries: RequestEntry[];
    total: number;
  } {
    let entries = Array.from(this.entries.values()).reverse();

    // Apply filters
    if (options.method) {
      const method = options.method.toUpperCase();
      entries = entries.filter((e) => e.method === method);
    }
    if (options.statusCode) {
      const statusCode = options.statusCode;
      entries = entries.filter((e) => e.statusCode === statusCode);
    }
    if (options.path) {
      const path = options.path;
      entries = entries.filter((e) => e.path.includes(path));
    }
    if (options.minDuration) {
      const minDuration = options.minDuration;
      entries = entries.filter((e) => e.duration >= minDuration);
    }

    const total = entries.length;
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    return {
      entries: entries.slice(offset, offset + limit),
      total,
    };
  }

  getById(id: string): RequestEntry | undefined {
    return this.entries.get(id);
  }

  getStats(): TelescopeStats {
    const entries = Array.from(this.entries.values());

    if (entries.length === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        requestsByStatus: {},
        requestsByMethod: {},
        slowestEndpoints: [],
      };
    }

    // Calculate stats
    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
    const avgResponseTime = Math.round(totalDuration / entries.length);

    const requestsByStatus: Record<number, number> = {};
    const requestsByMethod: Record<string, number> = {};
    const endpointStats: Map<string, { totalDuration: number; count: number }> =
      new Map();

    for (const entry of entries) {
      // Status codes
      requestsByStatus[entry.statusCode] =
        (requestsByStatus[entry.statusCode] || 0) + 1;

      // Methods
      requestsByMethod[entry.method] =
        (requestsByMethod[entry.method] || 0) + 1;

      // Endpoint durations
      const existing = endpointStats.get(entry.path);
      if (existing) {
        existing.totalDuration += entry.duration;
        existing.count += 1;
      } else {
        endpointStats.set(entry.path, {
          totalDuration: entry.duration,
          count: 1,
        });
      }
    }

    // Get slowest endpoints
    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([path, stats]) => ({
        path,
        avgDuration: Math.round(stats.totalDuration / stats.count),
        count: stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return {
      totalRequests: entries.length,
      avgResponseTime,
      requestsByStatus,
      requestsByMethod,
      slowestEndpoints,
    };
  }

  clear(): void {
    this.entries.clear();
  }

  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.retentionMinutes * 60 * 1000);
    for (const [id, entry] of this.entries) {
      if (entry.timestamp < cutoff) {
        this.entries.delete(id);
      }
    }
  }
}
