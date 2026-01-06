import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiemService } from './siem.service';
import { SiemController } from './siem.controller';
import { SiemIntegration } from './entities/siem-integration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SiemIntegration])],
  controllers: [SiemController],
  providers: [SiemService],
  exports: [SiemService],
})
export class SiemModule {}
