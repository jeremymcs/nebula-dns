/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * ClickHouse Module
 */

import { Module, Global } from '@nestjs/common';
import { ClickHouseService } from './clickhouse.service';

@Global()
@Module({
  providers: [ClickHouseService],
  exports: [ClickHouseService],
})
export class ClickHouseModule {}
