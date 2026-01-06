import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MspBillingController } from './msp-billing.controller';
import { MspBillingService } from './msp-billing.service';
import {
  QueryBundle,
  MspSubscription,
  MspPurchase,
  MspUsage,
  MspInvoice,
} from './entities';
import { Partner } from '../partners/entities/partner.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QueryBundle,
      MspSubscription,
      MspPurchase,
      MspUsage,
      MspInvoice,
      Partner,
      Tenant,
    ]),
    ClickHouseModule,
    EmailModule,
  ],
  controllers: [MspBillingController],
  providers: [MspBillingService],
  exports: [MspBillingService],
})
export class MspBillingModule {}

