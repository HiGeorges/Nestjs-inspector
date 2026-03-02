# @nestjs-tools/telescope

A Laravel Telescope-like request inspector for NestJS applications. Monitor and debug HTTP requests with a beautiful built-in dashboard.

## Features

- **Request Recording**: Automatically records all HTTP requests and responses
- **Beautiful Dashboard**: Built-in dark-themed dashboard to view and filter requests
- **Sensitive Data Redaction**: Automatically redacts sensitive headers and body fields
- **Statistics**: View request statistics, error rates, and slowest endpoints
- **Configurable**: Fully customizable options for your needs
- **Zero Dependencies**: Only requires NestJS peer dependencies

## Installation

```bash
npm install @nestjs-tools/telescope
```

## Quick Start

Import the `TelescopeModule` in your app module:

```typescript
import { Module } from '@nestjs/common';
import { TelescopeModule } from '@nestjs-tools/telescope';

@Module({
  imports: [
    TelescopeModule.forRoot({
      enabled: true,
      maxEntries: 1000,
      retentionMinutes: 60,
    }),
  ],
})
export class AppModule {}
```

Then visit `http://localhost:3000/telescope` to see the dashboard.

## Configuration

### Static Configuration

```typescript
TelescopeModule.forRoot({
  // Enable or disable the module (default: true)
  enabled: true,

  // Maximum number of entries to keep in memory (default: 1000)
  maxEntries: 1000,

  // Time in minutes to retain entries (default: 60)
  retentionMinutes: 60,

  // Route prefix for telescope endpoints (default: 'telescope')
  routePrefix: 'telescope',

  // Enable the HTML dashboard (default: true)
  dashboardEnabled: true,

  // Headers to redact (default: ['authorization', 'cookie', 'x-api-key'])
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],

  // Body fields to redact (default: ['password', 'token', 'secret', 'apiKey', 'creditCard'])
  sensitiveBodyFields: ['password', 'token', 'secret'],

  // Paths to exclude from recording (default: [])
  excludePaths: ['/health', '/metrics'],

  // Regex patterns for paths to exclude (default: [])
  ignorePatterns: [/^\/internal\/.*/],

  // Maximum length of response body to store (default: 1000)
  responseBodyMaxLength: 2000,
})
```

### Async Configuration

For dynamic configuration (e.g., using ConfigService):

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelescopeModule } from '@nestjs-tools/telescope';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TelescopeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        enabled: config.get('TELESCOPE_ENABLED', true),
        maxEntries: config.get('TELESCOPE_MAX_ENTRIES', 1000),
        retentionMinutes: config.get('TELESCOPE_RETENTION_MINUTES', 60),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Skip Recording for Specific Routes

Use the `@SkipTelescope()` decorator to exclude specific routes or controllers:

```typescript
import { Controller, Get } from '@nestjs/common';
import { SkipTelescope } from '@nestjs-tools/telescope';

@Controller('health')
export class HealthController {
  @Get()
  @SkipTelescope()
  check() {
    return { status: 'ok' };
  }
}

// Or skip entire controller
@Controller('internal')
@SkipTelescope()
export class InternalController {
  // All routes in this controller will be skipped
}
```

## API Endpoints

The module exposes the following endpoints (prefix configurable via `routePrefix`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/telescope` | Dashboard HTML page |
| GET | `/telescope/requests` | List recorded requests |
| GET | `/telescope/requests/:id` | Get a specific request |
| GET | `/telescope/stats` | Get request statistics |
| DELETE | `/telescope/clear` | Clear all recorded requests |

### Query Parameters for `/telescope/requests`

- `limit` - Number of entries to return (default: 50)
- `offset` - Offset for pagination (default: 0)
- `method` - Filter by HTTP method (GET, POST, etc.)
- `statusCode` - Filter by status code
- `path` - Filter by path (partial match)
- `minDuration` - Filter by minimum duration in ms

## Authentication / Access Control

### Making Telescope Routes Public (with global guards)

If you have a global authentication guard (like JWT), you need to exclude telescope routes. Use middleware to bypass authentication:

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TelescopeModule } from '@nestjs-tools/telescope';

@Module({
  imports: [TelescopeModule.forRoot()],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Exclude telescope routes from global guards by setting a flag
    consumer
      .apply((req, res, next) => {
        req.isTelescopeRoute = true;
        next();
      })
      .forRoutes('telescope', 'telescope/*');
  }
}
```

Then in your auth guard:

```typescript
canActivate(context: ExecutionContext) {
  const request = context.switchToHttp().getRequest();
  if (request.isTelescopeRoute) {
    return true;
  }
  // ... rest of your guard logic
}
```

### Protecting the Dashboard

To protect telescope routes in production, you can:

1. **Disable in production**:

```typescript
TelescopeModule.forRoot({
  enabled: process.env.NODE_ENV !== 'production',
})
```

2. **Use middleware for authentication**:

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TelescopeModule } from '@nestjs-tools/telescope';
import { AuthMiddleware } from './middleware/auth.middleware';

@Module({
  imports: [TelescopeModule.forRoot()],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('telescope', 'telescope/*');
  }
}
```

3. **Use a dedicated admin guard**:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TelescopeModule, TELESCOPE_SKIP_KEY } from '@nestjs-tools/telescope';

// In your guard, check for TELESCOPE_SKIP_KEY metadata
// and apply your admin authentication logic
```

## Using the Service Directly

You can inject the `TelescopeService` to access recorded requests programmatically:

```typescript
import { Injectable } from '@nestjs/common';
import { TelescopeService } from '@nestjs-tools/telescope';

@Injectable()
export class MonitoringService {
  constructor(private readonly telescopeService: TelescopeService) {}

  getSlowRequests() {
    const { entries } = this.telescopeService.getAll({
      minDuration: 1000,
      limit: 10,
    });
    return entries;
  }

  getErrorRequests() {
    const { entries } = this.telescopeService.getAll({
      statusCode: 500,
    });
    return entries;
  }

  getStats() {
    return this.telescopeService.getStats();
  }
}
```

## Environment Variables

Recommended environment variables for configuration:

```env
TELESCOPE_ENABLED=true
TELESCOPE_MAX_ENTRIES=1000
TELESCOPE_RETENTION_MINUTES=60
```

## Production Considerations

- **Disable in Production**: Consider disabling Telescope in production or limiting access
- **Memory Usage**: Entries are stored in memory; adjust `maxEntries` based on your memory constraints
- **Sensitive Data**: Review and customize `sensitiveHeaders` and `sensitiveBodyFields` for your application
- **Performance**: The interceptor adds minimal overhead, but consider using `excludePaths` for high-traffic endpoints

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
