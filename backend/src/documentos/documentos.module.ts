// Módulo de documentos con dependencias necesarias
import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { FormuladorModule } from '../formulador/formulador.module';

@Module({
  imports: [FormuladorModule],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}