import { DynamicModule, Module, Global, Provider, Type } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TelescopeService } from './telescope.service';
import { TelescopeController } from './telescope.controller';
import { TelescopeDashboardController } from './telescope-dashboard.controller';
import { TelescopeInterceptor } from './telescope.interceptor';
import { TELESCOPE_OPTIONS } from './telescope.constants';
import {
  TelescopeModuleOptions,
  TelescopeModuleAsyncOptions,
  TelescopeOptionsFactory,
} from './interfaces/telescope-options.interface';

@Global()
@Module({})
export class TelescopeModule {
  /**
   * Register the Telescope module with static configuration
   *
   * @example
   * ```typescript
   * TelescopeModule.forRoot({
   *   enabled: true,
   *   maxEntries: 1000,
   *   retentionMinutes: 60,
   * })
   * ```
   */
  static forRoot(options: TelescopeModuleOptions = {}): DynamicModule {
    const dashboardEnabled = options.dashboardEnabled ?? true;
    const controllers: Type[] = [TelescopeController];

    if (dashboardEnabled) {
      controllers.push(TelescopeDashboardController);
    }

    return {
      module: TelescopeModule,
      controllers,
      providers: [
        {
          provide: TELESCOPE_OPTIONS,
          useValue: options,
        },
        TelescopeService,
        {
          provide: APP_INTERCEPTOR,
          useClass: TelescopeInterceptor,
        },
      ],
      exports: [TelescopeService, TELESCOPE_OPTIONS],
    };
  }

  /**
   * Register the Telescope module with async configuration
   *
   * @example
   * ```typescript
   * TelescopeModule.forRootAsync({
   *   imports: [ConfigModule],
   *   useFactory: (config: ConfigService) => ({
   *     enabled: config.get('TELESCOPE_ENABLED', true),
   *     maxEntries: config.get('TELESCOPE_MAX_ENTRIES', 1000),
   *   }),
   *   inject: [ConfigService],
   * })
   * ```
   */
  static forRootAsync(options: TelescopeModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    // For async, we include both controllers since we can't know dashboardEnabled at compile time
    const controllers: Type[] = [TelescopeController, TelescopeDashboardController];

    return {
      module: TelescopeModule,
      imports: options.imports || [],
      controllers,
      providers: [
        ...asyncProviders,
        TelescopeService,
        {
          provide: APP_INTERCEPTOR,
          useClass: TelescopeInterceptor,
        },
      ],
      exports: [TelescopeService, TELESCOPE_OPTIONS],
    };
  }

  private static createAsyncProviders(options: TelescopeModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    return [this.createAsyncOptionsProvider(options)];
  }

  private static createAsyncOptionsProvider(
    options: TelescopeModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: TELESCOPE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const inject = options.useExisting || options.useClass;
    if (!inject) {
      return {
        provide: TELESCOPE_OPTIONS,
        useValue: {},
      };
    }

    return {
      provide: TELESCOPE_OPTIONS,
      useFactory: async (optionsFactory: TelescopeOptionsFactory) =>
        await optionsFactory.createTelescopeOptions(),
      inject: [inject],
    };
  }
}
