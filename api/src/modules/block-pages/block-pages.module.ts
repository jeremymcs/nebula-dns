import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockPagesService } from './block-pages.service';
import { BlockPagesController } from './block-pages.controller';
import { BlockPage } from './entities/block-page.entity';
import { AccessRequest } from './entities/access-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockPage, AccessRequest]),
  ],
  controllers: [BlockPagesController],
  providers: [BlockPagesService],
  exports: [BlockPagesService],
})
export class BlockPagesModule {}
