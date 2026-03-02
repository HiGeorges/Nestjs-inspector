import {
  Controller,
  Get,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TelescopeService } from './telescope.service';
import { SkipTelescope } from './decorators/skip-telescope.decorator';

@Controller('telescope')
@SkipTelescope()
export class TelescopeController {
  constructor(private readonly telescopeService: TelescopeService) {}

  @Get('requests')
  getRequests(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('method') method?: string,
    @Query('statusCode') statusCode?: string,
    @Query('path') path?: string,
    @Query('minDuration') minDuration?: string,
  ) {
    return this.telescopeService.getAll({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      method,
      statusCode: statusCode ? parseInt(statusCode, 10) : undefined,
      path,
      minDuration: minDuration ? parseInt(minDuration, 10) : undefined,
    });
  }

  @Get('requests/:id')
  getRequest(@Param('id') id: string) {
    return this.telescopeService.getById(id);
  }

  @Get('stats')
  getStats() {
    return this.telescopeService.getStats();
  }

  @Delete('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  clear() {
    this.telescopeService.clear();
  }
}
