// Controlador para manejo de documentos
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentosService } from './documentos.service';
import { FormuladorService } from '../formulador/formulador.service';

@Controller('documentos')
export class DocumentosController {
  constructor(
    private readonly documentosService: DocumentosService,
    private readonly formuladorService: FormuladorService,
  ) {}

  // Subir documento y analizar automáticamente con Claude
  @Post('subir')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const nombreUnico = Date.now() + extname(file.originalname);
          cb(null, nombreUnico);
        },
      }),
      fileFilter: (req, file, cb) => {
        const tiposPermitidos = [
          'application/pdf',
          'text/plain',
          'application/octet-stream',
          'application/x-pdf',
        ];
        if (
          tiposPermitidos.includes(file.mimetype) ||
          file.originalname.endsWith('.pdf') ||
          file.originalname.endsWith('.txt')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos PDF o TXT'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async subirDocumento(
    @UploadedFile() archivo: Express.Multer.File,
    @Body() body: { emailCliente?: string },
  ) {
    if (!archivo) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    // Extraer texto del documento
    const contenido = await this.documentosService.procesarArchivo(
      archivo.path,
      archivo.mimetype,
    );

    // Crear proyecto nuevo
    const proyecto = await this.formuladorService.crearProyecto({
      emailCliente: body.emailCliente || 'anonimo@asesoriapro.com',
      estado: 'pendiente',
    });

    // Analizar contenido con Claude automáticamente
    const proyectoAnalizado = await this.formuladorService.analizarDocumento(
      proyecto.id,
      contenido,
    );

    // Eliminar archivo temporal
    this.documentosService.eliminarArchivo(archivo.path);

    return {
      mensaje: 'Documento procesado exitosamente',
      proyecto: proyectoAnalizado,
    };
  }
}