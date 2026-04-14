import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { FormuladorController } from './formulador.controller';
import { FormuladorService } from './formulador.service';
import { ExportadorService } from './exportador.service';
import { Proyecto } from './entities/proyecto.entity';
import { FeedbackDocumento } from './entities/feedback-documento.entity';
import { ClaudeModule } from '../claude/claude.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyecto, FeedbackDocumento]),
    ClaudeModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'asesoria-ml-secret-2024',
    }),
  ],
  controllers: [FormuladorController],
  providers: [FormuladorService, ExportadorService],
  exports: [FormuladorService],
})
export class FormuladorModule {}
