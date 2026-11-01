import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockPagesService } from './block-pages.service';
import { BlockPagesController } from './block-pages.controller';
import { BlockPagesPublicController } from './block-pages-public.controller';
import { AdminPlatformBlockPageController } from './admin-platform-block-page.controller';
import { BlockPage } from './entities/block-page.entity';
import { AccessRequest } from './entities/access-request.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { ListsModule } from '../lists/lists.module';
import { PoliciesModule } from '../policies/policies.module';
import { EmailModule } from '../email/email.module';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockPage, AccessRequest, Tenant, Location]),
    TenantsModule,
    ListsModule,
    PoliciesModule,
    EmailModule,
    AdminModule,
  ],
  controllers: [
    BlockPagesPublicController,
    BlockPagesController,
    AdminPlatformBlockPageController,
  ],
  providers: [BlockPagesService],
  exports: [BlockPagesService],
})
export class BlockPagesModule {}
