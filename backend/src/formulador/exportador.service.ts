// Servicio para exportar proyectos formulados a Word y PDF con gráficas
import { Injectable } from '@nestjs/common';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from 'docx';
import * as puppeteer from 'puppeteer';

@Injectable()
export class ExportadorService {

  async exportarWord(proyecto: any): Promise<Buffer> {
    const secciones = this.parsearSecciones(proyecto.documentoFormulado);
    const tablasCronograma = this.generarTablaCronogramaWord(proyecto.documentoFormulado);

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'PROYECTO FORMULADO — AsesorIA Pro',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Tipo de proyecto: ', bold: true }),
                new TextRun(proyecto.tipoProyecto || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Área: ', bold: true }),
                new TextRun(proyecto.area || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Cliente: ', bold: true }),
                new TextRun(proyecto.emailCliente || ''),
              ],
            }),
            new Paragraph({ text: '' }),
            ...secciones,
            new Paragraph({ text: '' }),
            // Tabla de cronograma si se detectó
            ...(tablasCronograma.length > 0 ? [
              new Paragraph({
                text: 'CRONOGRAMA VISUAL',
                heading: HeadingLevel.HEADING_1,
              }),
              ...tablasCronograma,
            ] : []),
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  async exportarPDF(proyecto: any): Promise<Buffer> {
    const html = this.generarHTML(proyecto);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // Parsear secciones del documento en párrafos Word
  private parsearSecciones(texto: string): Paragraph[] {
    if (!texto) return [];
    const lineas = texto.split('\n');
    const parrafos: Paragraph[] = [];
    for (const linea of lineas) {
      const limpia = linea.trim();
      if (!limpia) {
        parrafos.push(new Paragraph({ text: '' }));
      } else if (limpia.startsWith('## ')) {
        parrafos.push(new Paragraph({
          text: limpia.replace('## ', ''),
          heading: HeadingLevel.HEADING_1,
        }));
      } else if (limpia.startsWith('### ')) {
        parrafos.push(new Paragraph({
          text: limpia.replace('### ', ''),
          heading: HeadingLevel.HEADING_2,
        }));
      } else if (limpia.startsWith('**') && limpia.endsWith('**')) {
        parrafos.push(new Paragraph({
          children: [new TextRun({ text: limpia.replace(/\*\*/g, ''), bold: true })],
        }));
      } else if (limpia.startsWith('- ')) {
        parrafos.push(new Paragraph({ text: limpia.replace('- ', '• ') }));
      } else {
        parrafos.push(new Paragraph({ text: limpia }));
      }
    }
    return parrafos;
  }

  // Generar tabla de cronograma para Word
  private generarTablaCronogramaWord(texto: string): (Table | Paragraph)[] {
    const fases = this.extraerFasesCronograma(texto);
    if (!fases.length) return [];

    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'FASE / ACTIVIDAD', bold: true })] })],
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: '1a5276', color: 'auto' },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'DURACIÓN', bold: true })] })],
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: '1a5276', color: 'auto' },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'SEMANAS', bold: true })] })],
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: '1a5276', color: 'auto' },
        }),
      ],
    });

    const filas = fases.map((fase, i) => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: fase.nombre })],
          shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'EBF5FB' : 'FFFFFF' },
        }),
        new TableCell({
          children: [new Paragraph({ text: fase.duracion })],
          shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'EBF5FB' : 'FFFFFF' },
        }),
        new TableCell({
          children: [new Paragraph({ text: this.generarBarraTexto(fase.semanas, fases.length > 0 ? Math.max(...fases.map(f => f.semanas)) : 8) })],
          shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'EBF5FB' : 'FFFFFF' },
        }),
      ],
    }));

    return [
      new Table({
        rows: [headerRow, ...filas],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    ];
  }

  private generarBarraTexto(semanas: number, max: number): string {
    const fill = Math.round((semanas / max) * 10);
    return '█'.repeat(fill) + '░'.repeat(10 - fill) + ` (${semanas} sem.)`;
  }

  // Extraer fases del cronograma del texto generado
  private extraerFasesCronograma(texto: string): { nombre: string; duracion: string; semanas: number }[] {
    const seccionCronograma = texto.match(/##\s*7\.?\s*CRONOGRAMA[\s\S]*?(?=##\s*8\.|$)/i)?.[0] || '';

    if (!seccionCronograma) {
      return [
        { nombre: 'Fase 1: Diagnóstico y planificación', duracion: '2 semanas', semanas: 2 },
        { nombre: 'Fase 2: Desarrollo y ejecución', duracion: '4 semanas', semanas: 4 },
        { nombre: 'Fase 3: Revisión y ajustes', duracion: '2 semanas', semanas: 2 },
        { nombre: 'Fase 4: Entrega y cierre', duracion: '1 semana', semanas: 1 },
      ];
    }

    const fases: { nombre: string; duracion: string; semanas: number }[] = [];
    const lineas = seccionCronograma.split('\n');

    for (const linea of lineas) {
      const semMatch = linea.match(/(\d+)\s*semana/i);
      const mesMatch = linea.match(/(\d+)\s*mes/i);
      if (linea.trim().length > 5 && (semMatch || mesMatch || linea.match(/fase|etapa|semana|mes|período/i))) {
        const semanas = semMatch ? parseInt(semMatch[1]) : (mesMatch ? parseInt(mesMatch[1]) * 4 : 2);
        const nombre = linea.replace(/^[-•*\d.]+\s*/, '').replace(/\*\*/g, '').trim().substring(0, 60);
        if (nombre.length > 3) {
          fases.push({ nombre, duracion: semMatch ? `${semanas} semanas` : mesMatch ? `${mesMatch[1]} mes(es)` : '2 semanas', semanas });
        }
      }
    }

    return fases.length >= 2 ? fases.slice(0, 8) : [
      { nombre: 'Fase 1: Diagnóstico y planificación', duracion: '2 semanas', semanas: 2 },
      { nombre: 'Fase 2: Desarrollo y ejecución', duracion: '4 semanas', semanas: 4 },
      { nombre: 'Fase 3: Revisión y ajustes', duracion: '2 semanas', semanas: 2 },
      { nombre: 'Fase 4: Entrega y cierre', duracion: '1 semana', semanas: 1 },
    ];
  }

  // Generar gráfica SVG de Gantt para el cronograma
  private generarGanttSVG(fases: { nombre: string; duracion: string; semanas: number }[]): string {
    const colores = ['#1a5276', '#2874a6', '#2e86c1', '#3498db', '#5dade2', '#85c1e9', '#a9cce3', '#d6eaf8'];
    const totalSemanas = fases.reduce((acc, f) => acc + f.semanas, 0);
    const alturaFila = 36;
    const marginLeft = 220;
    const anchoGrafica = 480;
    const alturaTotal = fases.length * alturaFila + 60;

    let barras = '';
    let acumulado = 0;
    fases.forEach((fase, i) => {
      const x = marginLeft + (acumulado / totalSemanas) * anchoGrafica;
      const ancho = (fase.semanas / totalSemanas) * anchoGrafica;
      const y = i * alturaFila + 40;
      const color = colores[i % colores.length];

      barras += `
        <rect x="${x}" y="${y}" width="${ancho - 2}" height="26" fill="${color}" rx="4"/>
        <text x="${x + ancho / 2}" y="${y + 17}" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${fase.semanas}s</text>
        <text x="${marginLeft - 8}" y="${y + 17}" text-anchor="end" fill="#333" font-size="11">${fase.nombre.substring(0, 28)}${fase.nombre.length > 28 ? '...' : ''}</text>
      `;
      acumulado += fase.semanas;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="740" height="${alturaTotal}" style="font-family:Arial,sans-serif">
      <rect width="100%" height="100%" fill="#f8f9fa" rx="8"/>
      <text x="370" y="22" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a5276">CRONOGRAMA DEL PROYECTO</text>
      <line x1="${marginLeft}" y1="35" x2="${marginLeft + anchoGrafica}" y2="35" stroke="#ccc" stroke-width="1"/>
      ${barras}
      <text x="${marginLeft}" y="${alturaTotal - 8}" font-size="10" fill="#666">Total: ${totalSemanas} semanas</text>
    </svg>`;
  }

  // Generar gráfica SVG de distribución de objetivos
  private generarGraficaObjetivosSVG(texto: string): string {
    const objetivos = this.extraerObjetivos(texto);
    if (!objetivos.length) return '';

    const colores = ['#1a5276', '#2874a6', '#2e86c1', '#3498db', '#5dade2'];
    const total = objetivos.length;
    const cx = 120; const cy = 100; const r = 80;
    let startAngle = -Math.PI / 2;
    let slices = '';
    let leyenda = '';

    objetivos.forEach((obj, i) => {
      const sliceAngle = (1 / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const color = colores[i % colores.length];
      slices += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}" stroke="white" stroke-width="2"/>`;
      leyenda += `<rect x="260" y="${15 + i * 22}" width="12" height="12" fill="${color}" rx="2"/>
        <text x="278" y="${25 + i * 22}" font-size="10" fill="#333">${obj.substring(0, 40)}</text>`;
      startAngle = endAngle;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="220" style="font-family:Arial,sans-serif">
      <rect width="100%" height="100%" fill="#f8f9fa" rx="8"/>
      <text x="300" y="18" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a5276">DISTRIBUCIÓN DE OBJETIVOS ESPECÍFICOS</text>
      ${slices}
      ${leyenda}
    </svg>`;
  }

  private extraerObjetivos(texto: string): string[] {
    const seccion = texto.match(/objetivo[s]?\s+específico[s]?[\s\S]*?(?=##\s*5\.|##\s*6\.|$)/i)?.[0] || '';
    const lineas = seccion.split('\n')
      .filter(l => l.trim().startsWith('-') || /^\d+\./.test(l.trim()))
      .map(l => l.replace(/^[-•*\d.]+\s*/, '').replace(/\*\*/g, '').trim())
      .filter(l => l.length > 5);
    return lineas.slice(0, 5);
  }

  // Generar HTML completo con gráficas para el PDF
  private generarHTML(proyecto: any): string {
    const contenido = proyecto.documentoFormulado || '';
    const htmlContenido = contenido
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');

    const fases = this.extraerFasesCronograma(contenido);
    const ganttSVG = this.generarGanttSVG(fases);
    const objetivosSVG = this.generarGraficaObjetivosSVG(contenido);

    return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
          h1 { color: #1a5276; text-align: center; border-bottom: 3px solid #1a5276; padding-bottom: 10px; }
          h2 { color: #1a5276; border-bottom: 1px solid #aed6f1; padding-bottom: 5px; margin-top: 24px; }
          h3 { color: #2874a6; }
          .info { background: #eaf2ff; border-left: 4px solid #1a5276; padding: 12px 16px; margin-bottom: 24px; border-radius: 4px; }
          li { margin: 5px 0; }
          .grafica-section { margin: 24px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6; }
          .grafica-titulo { font-size: 13px; font-weight: bold; color: #1a5276; margin-bottom: 12px; text-align: center; }
          .pie-container { display: flex; align-items: center; gap: 24px; }
          .footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 12px; font-size: 10px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>PROYECTO FORMULADO — AsesorIA Pro</h1>
        <div class="info">
          <strong>Tipo:</strong> ${proyecto.tipoProyecto || 'N/A'} &nbsp;|&nbsp;
          <strong>Área:</strong> ${proyecto.area || 'N/A'} &nbsp;|&nbsp;
          <strong>Cliente:</strong> ${proyecto.emailCliente || 'N/A'}
        </div>

        ${htmlContenido}

        <div class="grafica-section" style="page-break-before: always;">
          <div class="grafica-titulo">CRONOGRAMA VISUAL DEL PROYECTO</div>
          ${ganttSVG}
        </div>

        ${objetivosSVG ? `
        <div class="grafica-section">
          <div class="grafica-titulo">DISTRIBUCIÓN DE OBJETIVOS</div>
          ${objetivosSVG}
        </div>` : ''}

        <div class="footer">
          Generado por AsesorIA Pro · ${new Date().toLocaleDateString('es-CO')}
        </div>
      </body>
      </html>`;
  }
}
