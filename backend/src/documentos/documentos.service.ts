// Servicio para manejo de documentos y extracción de texto
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
const pdfParse = require('pdf-parse');

@Injectable()
export class DocumentosService {

  // Extraer texto de un archivo PDF
  async extraerTextoPDF(rutaArchivo: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(rutaArchivo);
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`Error al leer el PDF: ${error.message}`);
    }
  }

  // Extraer texto de un archivo TXT
  async extraerTextoTXT(rutaArchivo: string): Promise<string> {
    try {
      return fs.readFileSync(rutaArchivo, 'utf-8');
    } catch (error) {
      throw new Error(`Error al leer el archivo: ${error.message}`);
    }
  }

  // Procesar archivo según su tipo
  async procesarArchivo(rutaArchivo: string, tipoMime: string): Promise<string> {
    const esPDF =
      tipoMime === 'application/pdf' ||
      tipoMime === 'application/x-pdf' ||
      (tipoMime === 'application/octet-stream' && rutaArchivo.endsWith('.pdf'));

    if (esPDF) {
      return await this.extraerTextoPDF(rutaArchivo);
    } else if (tipoMime === 'text/plain') {
      return await this.extraerTextoTXT(rutaArchivo);
    } else {
      throw new Error('Tipo de archivo no soportado. Use PDF o TXT.');
    }
  }

  // Eliminar archivo temporal después de procesarlo
  eliminarArchivo(rutaArchivo: string): void {
    try {
      if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo);
      }
    } catch (error) {
      console.error('Error al eliminar archivo temporal:', error.message);
    }
  }
}