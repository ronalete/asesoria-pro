import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetectorController } from './detector.controller';
import { DetectorService } from './detector.service';
import { AnalisisDeteccion } from './entities/analisis-deteccion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnalisisDeteccion])],
  controllers: [DetectorController],
  providers: [DetectorService],
  exports: [DetectorService],
})
export class DetectorModule {}
