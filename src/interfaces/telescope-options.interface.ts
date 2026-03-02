import { ModuleMetadata, Type, InjectionToken } from '@nestjs/common';

export interface TelescopeModuleOptions {
  /**
   * Enable or disable the telescope module
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum number of request entries to keep in memory
   * @default 1000
   */
  maxEntries?: number;

  /**
   * Time in minutes to retain entries before automatic cleanup
   * @default 60
   */
  retentionMinutes?: number;

  /**
   * Route prefix for telescope endpoints
   * @default 'telescope'
   */
  routePrefix?: string;

  /**
   * Enable the HTML dashboard
   * @default true
   */
  dashboardEnabled?: boolean;

  /**
   * Headers to redact from recorded requests
   * @default ['authorization', 'cookie', 'x-api-key']
   */
  sensitiveHeaders?: string[];

  /**
   * Body fields to redact from recorded requests
   * @default ['password', 'token', 'secret', 'apiKey', 'creditCard']
   */
  sensitiveBodyFields?: string[];

  /**
   * Paths to exclude from recording (exact match)
   * @default []
   */
  excludePaths?: string[];

  /**
   * Regex patterns for paths to exclude from recording
   * @default []
   */
  ignorePatterns?: RegExp[];

  /**
   * Maximum length of response body to store
   * @default 1000
   */
  responseBodyMaxLength?: number;
}

export interface TelescopeOptionsFactory {
  createTelescopeOptions():
    | Promise<TelescopeModuleOptions>
    | TelescopeModuleOptions;
}

export interface TelescopeModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<TelescopeOptionsFactory>;
  useClass?: Type<TelescopeOptionsFactory>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory?: (...args: any[]) => Promise<TelescopeModuleOptions> | TelescopeModuleOptions;
  inject?: InjectionToken[];
}
