import { SetMetadata } from '@nestjs/common';

export const TELESCOPE_SKIP_KEY = 'telescope:skip';

/**
 * Decorator to skip telescope recording for a specific route or controller
 *
 * @example
 * ```typescript
 * @SkipTelescope()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const SkipTelescope = () => SetMetadata(TELESCOPE_SKIP_KEY, true);
