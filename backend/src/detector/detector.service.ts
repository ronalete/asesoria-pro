import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { AnalisisDeteccion } from './entities/analisis-deteccion.entity';

@Injectable()
export class DetectorService {
  private cliente: Anthropic;

  constructor(
    @InjectRepository(AnalisisDeteccion)
    private repo: Repository<AnalisisDeteccion>,
  ) {
    this.cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  private limpiarJSON(texto: string): string {
    return texto.replace(/```json|```/g, '').trim();
  }

  async analizar(texto: string, emailCliente?: string): Promise<AnalisisDeteccion> {
    const textoCortado = texto.substring(0, 7000).trim();

    const prompt = `Eres un experto en detección de contenido generado por IA y plagio académico en textos en español.

Analiza el siguiente texto y responde SOLO con un JSON con esta estructura exacta (sin texto adicional antes ni después):

{
  "scoreIA": número del 0 al 100 (probabilidad de que el texto sea generado por IA),
  "scorePlagio": número del 0 al 100 (probabilidad de que contenga plagio o texto genérico copiado),
  "clasificacion": "bajo" | "medio" | "alto" | "muy_alto",
  "resumen": "diagnóstico general del texto en 2-3 oraciones",
  "secciones": [
    {
      "texto": "fragmento EXACTO del texto analizado (máximo 200 caracteres por fragmento)",
      "tipo": "ia_generado" | "plagio_potencial" | "mixto" | "original",
      "confianza": número del 0 al 100,
      "evidencia": "explicación concreta de por qué se detectó este problema",
      "recomendacion": "sugerencia específica y accionable para mejorar este fragmento"
    }
  ],
  "recomendaciones": [
    "recomendación general 1",
    "recomendación general 2",
    "recomendación general 3"
  ]
}

Criterios para detectar IA:
- Frases perfectamente estructuradas sin errores naturales del escritor
- Vocabulario excesivamente formal y uniforme sin variación de estilo
- Ausencia de experiencias personales, anécdotas o ejemplos concretos propios
- Transiciones formulaicas: "En primer lugar", "Por otro lado", "En conclusión"
- Listas y enumeraciones perfectamente balanceadas
- Repetición de estructuras gramaticales muy similares

Criterios para detectar plagio académico:
- Definiciones textuales de conceptos sin comillas ni cita de fuente
- Marco teórico copiado de libros o Wikipedia (debe parafrasearse y citarse)
- Cambios abruptos de tono o estilo entre párrafos
- Texto que no conecta con el argumento del autor
- Frases muy conocidas en la literatura académica sin atribución

IMPORTANTE — Reglas académicas colombianas:
- El marco teórico NUNCA debe copiarse textualmente: debe parafrasearse y citar (APA 7)
- Las definiciones deben tener fuente: Ejemplo: "Según García (2020), la innovación es..."
- Identifica específicamente si hay definiciones sin cita

Identifica entre 3 y 8 secciones problemáticas. Si el texto es mayormente original, incluye igualmente secciones marcadas como "original" para dar contexto positivo.

Texto a analizar:
${textoCortado}`;

    const respuesta = await this.cliente.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (respuesta.content[0] as { text: string }).text;
    let resultado: any;
    try {
      resultado = JSON.parse(this.limpiarJSON(raw));
    } catch {
      throw new Error(`Respuesta inválida del detector: ${raw.substring(0, 200)}`);
    }

    const analisis = this.repo.create({
      textoAnalizado: textoCortado,
      scoreIA: parseFloat(resultado.scoreIA) || 0,
      scorePlagio: parseFloat(resultado.scorePlagio) || 0,
      clasificacion: resultado.clasificacion || 'bajo',
      resumen: resultado.resumen || '',
      secciones: resultado.secciones || [],
      recomendaciones: resultado.recomendaciones || [],
      emailCliente,
    });

    return await this.repo.save(analisis);
  }

  async obtenerPorId(id: string): Promise<AnalisisDeteccion | null> {
    return await this.repo.findOne({ where: { id } });
  }

  async listar(): Promise<AnalisisDeteccion[]> {
    return await this.repo.find({ order: { creadoEn: 'DESC' }, take: 50 });
  }
}
