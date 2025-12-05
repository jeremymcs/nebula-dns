import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { CustomList } from './entities/custom-list.entity';
import { CustomListEntry } from './entities/custom-list-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomList, CustomListEntry])],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
