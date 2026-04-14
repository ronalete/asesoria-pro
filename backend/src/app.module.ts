import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { Solicitud } from './solicitudes/entities/solicitud.entity';
import { FormuladorModule } from './formulador/formulador.module';
import { DocumentosModule } from './documentos/documentos.module';
import { Proyecto } from './formulador/entities/proyecto.entity';
import { ClaudeModule } from './claude/claude.module';
import { DetectorModule } from './detector/detector.module';
import { AnalisisDeteccion } from './detector/entities/analisis-deteccion.entity';
import { FeedbackDocumento } from './formulador/entities/feedback-documento.entity';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AuthModule } from './auth/auth.module';
import { Usuario } from './auth/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'asesoria_user',
      password: process.env.DB_PASSWORD || 'asesoria123',
      database: process.env.DB_NAME || 'asesoria_ia_db',
      entities: [Solicitud, Proyecto, AnalisisDeteccion, FeedbackDocumento, Usuario],
      synchronize: true,
    }),
    SolicitudesModule,
    FormuladorModule,
    DocumentosModule,
    ClaudeModule,
    DetectorModule,
    WhatsappModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
