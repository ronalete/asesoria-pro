import {
  Controller, Post, Get, Param, Body, Res,
  NotFoundException, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import type { Response } from 'express';
import { DetectorService } from './detector.service';

const pdfParse = require('pdf-parse');

@Controller('detector')
export class DetectorController {
  constructor(private readonly detectorService: DetectorService) {}

  // Analizar texto pegado directamente
  @Post('analizar')
  async analizarTexto(
    @Body() body: { texto: string; emailCliente?: string },
  ) {
    if (!body.texto || body.texto.trim().length < 50) {
      return { success: false, message: 'El texto debe tener al menos 50 caracteres' };
    }
    const data = await this.detectorService.analizar(body.texto, body.emailCliente);
    return { success: true, data };
  }

  // Analizar archivo PDF o TXT
  @Post('analizar-archivo')
  @UseInterceptors(FileInterceptor('archivo', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
  }))
  async analizarArchivo(
    @UploadedFile() archivo: Express.Multer.File,
    @Body() body: { emailCliente?: string },
    @Res() res: Response,
  ) {
    if (!archivo) {
      return res.status(400).json({ success: false, message: 'No se recibió archivo' });
    }

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
      try { fs.unlinkSync(archivo.path); } catch {}
    }

    if (!contenido || contenido.trim().length < 50) {
      return res.status(400).json({ success: false, message: 'No se pudo extraer texto del archivo' });
    }

    const data = await this.detectorService.analizar(contenido, body.emailCliente);
    return res.json({ success: true, data });
  }

  @Get()
  async listar() {
    const data = await this.detectorService.listar();
    return { success: true, data };
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    const data = await this.detectorService.obtenerPorId(id);
    if (!data) throw new NotFoundException(`Análisis ${id} no encontrado`);
    return { success: true, data };
  }
}
