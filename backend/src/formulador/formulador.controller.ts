// Controlador del agente formulador
import {
  Controller, Get, Post, Put, Delete, Body, Param, Res, Headers,
  NotFoundException, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { FormuladorService } from './formulador.service';
import { ExportadorService } from './exportador.service';
import { Proyecto } from './entities/proyecto.entity';
import { JwtService } from '@nestjs/jwt';

const pdfParse = require('pdf-parse');

@Controller('formulador')
export class FormuladorController {
  constructor(
    private readonly formuladorService: FormuladorService,
    private readonly exportadorService: ExportadorService,
    private readonly jwtService: JwtService,
  ) {}

  private extraerPayload(authHeader?: string): { sub?: string; rol?: string } {
    if (!authHeader?.startsWith('Bearer ')) return {};
    try {
      const payload: any = this.jwtService.decode(authHeader.slice(7));
      return { sub: payload?.sub, rol: payload?.rol };
    } catch { return {}; }
  }

  private extraerUsuarioId(authHeader?: string): string | undefined {
    return this.extraerPayload(authHeader).sub;
  }

  @Post()
  async crearProyecto(
    @Body() datos: Partial<Proyecto>,
    @Headers('authorization') auth?: string,
  ) {
    const usuarioId = this.extraerUsuarioId(auth);
    const data = await this.formuladorService.crearProyecto({ ...datos, usuarioId });
    return { success: true, data };
  }

  @Get()
  async obtenerTodos(@Headers('authorization') auth?: string) {
    const { sub, rol } = this.extraerPayload(auth);
    // Admin ve todos los proyectos, usuario normal solo los suyos
    const usuarioId = rol === 'admin' ? undefined : sub;
    const data = await this.formuladorService.obtenerTodos(usuarioId);
    return { success: true, data };
  }

  @Get('feedback/estadisticas')
  async feedbackStats() {
    const data = await this.formuladorService.obtenerFeedbackStats();
    return { success: true, data };
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    const data = await this.formuladorService.obtenerPorId(id);
    if (!data) throw new NotFoundException(`Proyecto ${id} no encontrado`);
    return { success: true, data };
  }

  // Subir documento PDF/TXT y extraer texto
  @Post(':id/subir-documento')
  @UseInterceptors(FileInterceptor('archivo', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const nombre = `${Date.now()}-${file.originalname}`;
        cb(null, nombre);
      },
    }),
  }))
  async subirDocumento(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    if (!archivo) throw new NotFoundException('No se recibió ningún archivo');

    let contenido = '';
    try {
      const esPDF = archivo.mimetype === 'application/pdf'
        || archivo.originalname.toLowerCase().endsWith('.pdf');

      if (esPDF) {
        const buffer = fs.readFileSync(archivo.path);
        const parsed = await pdfParse(buffer);
        contenido = parsed.text;
      } else {
        contenido = fs.readFileSync(archivo.path, 'utf-8');
      }
    } finally {
      // Eliminar archivo temporal
      try { fs.unlinkSync(archivo.path); } catch {}
    }

    const data = await this.formuladorService.guardarDocumento(id, contenido, archivo.originalname);
    return { success: true, data, caracteresExtraidos: contenido.length };
  }

  @Post(':id/analizar')
  async analizarDocumento(
    @Param('id') id: string,
    @Body() body: { contenido?: string },
  ) {
    const data = await this.formuladorService.analizarDocumento(id, body.contenido);
    return { success: true, data };
  }

  @Get(':id/preguntas')
  async generarPreguntas(@Param('id') id: string) {
    const data = await this.formuladorService.generarPreguntas(id);
    return { success: true, data };
  }

  @Put(':id/respuestas')
  async actualizarRespuestas(
    @Param('id') id: string,
    @Body() body: { respuestas: object },
  ) {
    const data = await this.formuladorService.actualizarRespuestas(id, body.respuestas);
    return { success: true, data };
  }

  @Put(':id/servicios')
  async guardarServicios(
    @Param('id') id: string,
    @Body() body: { serviciosAdicionales: object },
  ) {
    await this.formuladorService.actualizarEstado(id, 'pendiente');
    const data = await this.formuladorService.guardarServicios(id, body.serviciosAdicionales);
    return { success: true, data };
  }

  @Delete(':id')
  async eliminarProyecto(
    @Param('id') id: string,
    @Headers('authorization') auth?: string,
  ) {
    const usuarioId = this.extraerUsuarioId(auth) || '';
    await this.formuladorService.eliminarProyecto(id, usuarioId);
    return { success: true, message: 'Proyecto eliminado' };
  }

  @Post(':id/formular')
  async formularProyecto(@Param('id') id: string) {
    const data = await this.formuladorService.formularProyecto(id);
    return { success: true, data };
  }

  @Put(':id/estado')
  async actualizarEstado(
    @Param('id') id: string,
    @Body() body: { estado: string },
  ) {
    const data = await this.formuladorService.actualizarEstado(id, body.estado);
    return { success: true, data };
  }

  // Guardar feedback del usuario para autoaprendizaje
  @Post(':id/feedback')
  async guardarFeedback(
    @Param('id') id: string,
    @Body() body: { calificacion: number; comentario?: string },
  ) {
    const data = await this.formuladorService.guardarFeedback(id, body.calificacion, body.comentario);
    return { success: true, data, message: '¡Gracias! Tu feedback mejora los próximos documentos.' };
  }

  @Get(':id/exportar/word')
  async exportarWord(@Param('id') id: string, @Res() res: Response) {
    const proyecto = await this.formuladorService.obtenerPorId(id);
    if (!proyecto) throw new NotFoundException(`Proyecto ${id} no encontrado`);
    const buffer = await this.exportadorService.exportarWord(proyecto);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="proyecto-${id}.docx"`,
    });
    res.send(buffer);
  }

  @Get(':id/exportar/pdf')
  async exportarPDF(@Param('id') id: string, @Res() res: Response) {
    const proyecto = await this.formuladorService.obtenerPorId(id);
    if (!proyecto) throw new NotFoundException(`Proyecto ${id} no encontrado`);
    const buffer = await this.exportadorService.exportarPDF(proyecto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proyecto-${id}.pdf"`,
    });
    res.send(buffer);
  }
}
