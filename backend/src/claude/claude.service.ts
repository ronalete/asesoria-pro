// Servicio principal para integración con Claude API de Anthropic
import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export interface ContextoProyecto {
  tipoServicio: string;
  tipoProyecto?: string;
  area?: string;
  carrera?: string;
  semestre?: string;
  universidad?: string;
  materia?: string;
  organizacion?: string;
  sector?: string;
  descripcion?: string;
}

@Injectable()
export class ClaudeService {
  private cliente: Anthropic;

  constructor() {
    this.cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // Chat conversacional general con historial de mensajes
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    const sistemaPrompt = `Eres AsesorIA Pro, un asistente experto en formulación de proyectos académicos,
    empresariales y de emprendimiento. Ayudas a estudiantes, empresas y emprendedores colombianos con
    asesoría profesional. Responde siempre en español colombiano, de forma clara y estructurada.`;

    const mensajesFormateados = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const respuesta = await this.cliente.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-5',
      max_tokens: 2000,
      system: sistemaPrompt,
      messages: mensajesFormateados,
    });

    return (respuesta.content[0] as { text: string }).text;
  }

  // Limpiar texto extraído de PDF (elimina caracteres problemáticos)
  private limpiarTexto(texto: string): string {
    return texto
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // caracteres de control
      .replace(/\uFFFD/g, ' ')                              // caracteres de reemplazo
      .replace(/ {3,}/g, '  ')                              // espacios excesivos
      .substring(0, 8000)                                   // máximo 8000 caracteres
      .trim();
  }

  // Analizar contenido de un documento con contexto del usuario
  async analizarDocumento(contenido: string, contexto?: ContextoProyecto): Promise<string> {
    contenido = this.limpiarTexto(contenido);
    let infoContexto = '';
    if (contexto) {
      if (contexto.tipoServicio === 'academico') {
        infoContexto = `
        Contexto del estudiante:
        - Carrera: ${contexto.carrera || 'No especificada'}
        - Semestre: ${contexto.semestre || 'No especificado'}
        - Universidad: ${contexto.universidad || 'No especificada'}
        - Materia: ${contexto.materia || 'No especificada'}`;
      } else if (contexto.tipoServicio === 'empresarial') {
        infoContexto = `
        Contexto empresarial:
        - Organización: ${contexto.organizacion || 'No especificada'}
        - Sector: ${contexto.sector || 'No especificado'}`;
      } else if (contexto.tipoServicio === 'publico') {
        infoContexto = `
        Contexto sector público:
        - Entidad: ${contexto.organizacion || 'No especificada'}
        - Sector: ${contexto.sector || 'No especificado'}`;
      }
    }

    const mensaje = await this.cliente.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `Analiza el siguiente documento y responde SOLO con un JSON con esta estructura exacta:
        {
          "tipoProyecto": "investigacion|empresarial|academico|tecnologico|social|emprendimiento",
          "area": "área del conocimiento principal detectada",
          "descripcionBreve": "resumen del documento en máximo 2 oraciones",
          "enfoque": "aspecto principal que debe desarrollarse en el proyecto"
        }
        ${infoContexto}

        Documento a analizar:
        ${contenido}`,
      }],
    });

    return (mensaje.content[0] as { text: string }).text;
  }

  // Generar preguntas enfocadas en preferencias de formato, normas y cómo quiere el documento
  async generarPreguntas(contexto: ContextoProyecto, resumenDocumento?: string): Promise<string> {
    let perfilUsuario = '';
    let instruccionTipo = '';

    if (contexto.tipoServicio === 'academico' || contexto.tipoServicio === 'grado') {
      perfilUsuario = `Estudiante de ${contexto.carrera || 'carrera no especificada'}, semestre ${contexto.semestre || 'N/A'}, universidad ${contexto.universidad || 'N/A'}, materia: ${contexto.materia || 'N/A'}.`;
      instruccionTipo = `Las preguntas deben descubrir CÓMO el estudiante quiere el documento, NO qué contenido tiene.
      Incluye preguntas sobre: norma de citación, tipo de entrega, si el profesor tiene recomendaciones especiales,
      extensión esperada, enfoque o argumento principal que quiere desarrollar.`;
    } else if (contexto.tipoServicio === 'empresarial') {
      perfilUsuario = `Empresa: ${contexto.organizacion || 'N/A'}, sector: ${contexto.sector || 'N/A'}.`;
      instruccionTipo = `Las preguntas deben descubrir CÓMO la empresa quiere el documento: tono (formal/ejecutivo),
      audiencia objetivo, extensión, si requiere anexos o gráficas, normativa sectorial aplicable.`;
    } else if (contexto.tipoServicio === 'publico') {
      perfilUsuario = `Entidad pública: ${contexto.organizacion || 'N/A'}, sector: ${contexto.sector || 'N/A'}.`;
      instruccionTipo = `Las preguntas deben descubrir: normas del sector público colombiano aplicables,
      si hay formato institucional exigido, presupuesto estimado, ente aprobador.`;
    } else {
      perfilUsuario = `Proyecto personal en área: ${contexto.area || 'general'}.`;
      instruccionTipo = `Las preguntas deben descubrir: propósito del documento, audiencia, tono,
      extensión deseada, si tiene restricciones o guías específicas.`;
    }

    const infoDocumento = resumenDocumento
      ? `\nDel documento analizado se extrajo: ${resumenDocumento}`
      : '';

    const mensaje = await this.cliente.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Eres un asesor profesional de documentos. Genera exactamente 6 preguntas para entender CÓMO el cliente quiere su documento.

        PERFIL: ${perfilUsuario}
        ${infoDocumento}

        ${instruccionTipo}

        REGLAS IMPORTANTES:
        - Las preguntas deben ser sobre FORMATO, NORMAS y PREFERENCIAS del documento, NO sobre el contenido técnico.
        - Al menos 3 preguntas deben ser CERRADAS con opciones predefinidas (tipo: "cerrada").
        - Las preguntas abiertas deben ser cortas y directas (tipo: "abierta").
        - Para académico: una pregunta SIEMPRE debe ser sobre la norma de citación con opciones.
        - Para académico: una pregunta SIEMPRE debe ser si el profesor tiene recomendaciones especiales.

        Responde SOLO con este JSON exacto (sin texto adicional):
        {
          "preguntas": [
            {
              "id": 1,
              "pregunta": "texto de la pregunta",
              "tipo": "cerrada",
              "opciones": ["Opción 1", "Opción 2", "Opción 3"],
              "ayuda": "texto breve de orientación"
            },
            {
              "id": 2,
              "pregunta": "texto de la pregunta",
              "tipo": "abierta",
              "opciones": [],
              "ayuda": "texto breve de orientación"
            }
          ]
        }`,
      }],
    });

    return (mensaje.content[0] as { text: string }).text;
  }

  // Formular el proyecto completo con base en todo el contexto y respuestas
  async formularProyecto(
    contexto: ContextoProyecto,
    contenidoGuia: string,
    respuestas: object,
    serviciosAdicionales?: object,
    ejemplosAprendizaje?: { calificacion: number; comentario?: string; resumen?: string }[],
  ): Promise<string> {
    let encabezadoContexto = '';

    if (contexto.tipoServicio === 'academico') {
      encabezadoContexto = `
      PERFIL DEL ESTUDIANTE:
      - Carrera: ${contexto.carrera}
      - Semestre: ${contexto.semestre}
      - Universidad: ${contexto.universidad}
      - Materia: ${contexto.materia}`;
    } else if (contexto.tipoServicio === 'empresarial') {
      encabezadoContexto = `
      PERFIL EMPRESARIAL:
      - Organización: ${contexto.organizacion}
      - Sector: ${contexto.sector}`;
    } else if (contexto.tipoServicio === 'publico') {
      encabezadoContexto = `
      ENTIDAD PÚBLICA:
      - Entidad: ${contexto.organizacion}
      - Sector: ${contexto.sector}`;
    } else if (contexto.tipoServicio === 'tutela') {
      encabezadoContexto = `
      DATOS DE LA TUTELA:
      - Tipo de tutela: ${contexto.sector || 'No especificado'}
      - Derecho fundamental vulnerado: ${contexto.area || 'No especificado'}
      - Entidad/Persona accionada: ${contexto.organizacion || 'No especificada'}`;
    }

    contenidoGuia = this.limpiarTexto(contenidoGuia);

    // Sección de autoaprendizaje: incluir feedback de documentos anteriores bien calificados
    let seccionAprendizaje = '';
    if (ejemplosAprendizaje && ejemplosAprendizaje.length > 0) {
      const buenos = ejemplosAprendizaje.filter(e => e.calificacion >= 4);
      if (buenos.length > 0) {
        seccionAprendizaje = `
        APRENDIZAJE DE DOCUMENTOS ANTERIORES BIEN VALORADOS:
        Los siguientes documentos similares recibieron calificaciones altas (${buenos.map(e => `${e.calificacion}/5`).join(', ')}).
        Toma nota de los comentarios de mejora y aplícalos:
        ${buenos.map((e, i) => `
        Ejemplo ${i + 1} (${e.calificacion}/5):
        ${e.comentario ? `- Feedback del usuario: "${e.comentario}"` : ''}
        ${e.resumen ? `- Estilo del documento exitoso: "${e.resumen.substring(0, 400)}..."` : ''}
        `).join('\n')}
        `;
      }
    }

    const mensaje = await this.cliente.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-5',
      max_tokens: 5000,
      messages: [{
        role: 'user',
        content: `Eres un asesor profesional de Asesorías Profesionales. Genera un documento completo,
        profesional y coherente en español colombiano, siguiendo exactamente las preferencias del cliente.

        TIPO DE SERVICIO: ${contexto.tipoServicio?.toUpperCase()}
        ${encabezadoContexto}
        TIPO DE PROYECTO: ${contexto.tipoProyecto || 'N/A'}
        ÁREA / META: ${contexto.area || 'N/A'}
        DETALLE ADICIONAL: ${contexto.materia || 'N/A'}
        ${seccionAprendizaje}

        GUÍA / DOCUMENTO BASE:
        ${contenidoGuia || 'No se proporcionó documento base.'}

        RESPUESTAS DEL USUARIO:
        ${JSON.stringify(respuestas, null, 2)}

        ${this.obtenerEstructuraServicio(contexto.tipoServicio)}`,
      }],
    });

    return (mensaje.content[0] as { text: string }).text;
  }

  private obtenerEstructuraServicio(tipoServicio: string): string {
    const estructuras: Record<string, string> = {
      beneficio_financiero: `
Genera un PLAN DE BENEFICIO FINANCIERO completo y profesional con estas secciones:

## 1. DIAGNÓSTICO FINANCIERO ACTUAL
## 2. FUENTES DE INGRESO IDENTIFICADAS
### 2.1 Ingresos actuales
### 2.2 Oportunidades de nuevos ingresos
## 3. ESTRATEGIAS DE MONETIZACIÓN
### 3.1 Estrategia a corto plazo (0-3 meses)
### 3.2 Estrategia a mediano plazo (3-12 meses)
## 4. OPTIMIZACIÓN DE COSTOS
## 5. PROYECCIÓN FINANCIERA (tabla estimada a 12 meses)
## 6. PLAN DE ACCIÓN PRIORITARIO
### 6.1 Acciones inmediatas (primera semana)
### 6.2 Acciones del primer mes
## 7. KPIs FINANCIEROS A MONITOREAR
## 8. FUENTES DE FINANCIACIÓN RECOMENDADAS
## 9. REFERENCIAS Y RECURSOS

El plan debe ser concreto, accionable y con cifras realistas adaptadas al contexto colombiano.`,

      pauta_marketing: `
Genera un PLAN DE PAUTA Y MARKETING DIGITAL completo con estas secciones:

## 1. ANÁLISIS DEL MERCADO OBJETIVO
### 1.1 Perfil del cliente ideal (buyer persona)
### 1.2 Competencia identificada
## 2. ESTRATEGIA DE CANALES PUBLICITARIOS
### 2.1 Canales recomendados (Meta Ads, Google Ads, TikTok Ads, etc.)
### 2.2 Justificación de cada canal
## 3. DISTRIBUCIÓN DEL PRESUPUESTO
## 4. CRONOGRAMA DE CAMPAÑA (semana a semana)
## 5. TIPOS DE CONTENIDO Y MENSAJES CLAVE
### 5.1 Mensajes para cada canal
### 5.2 Formatos recomendados
## 6. MÉTRICAS Y KPIs DE LA PAUTA
## 7. OPTIMIZACIÓN Y SEGUIMIENTO
## 8. PROYECCIÓN DE RESULTADOS ESPERADOS
## 9. REFERENCIAS Y HERRAMIENTAS RECOMENDADAS

La estrategia debe ser práctica, con ejemplos reales y adaptada al presupuesto indicado.`,

      redes_sociales: `
Genera una ESTRATEGIA DE IMPACTO EN REDES SOCIALES completa con estas secciones:

## 1. DIAGNÓSTICO DE PRESENCIA DIGITAL ACTUAL
## 2. PLATAFORMAS RECOMENDADAS
### 2.1 Plataforma principal
### 2.2 Plataformas de apoyo
### 2.3 Justificación por plataforma
## 3. ESTRATEGIA DE CONTENIDO
### 3.1 Pilares de contenido (3-5 temas clave)
### 3.2 Formatos por plataforma (Reels, Stories, Carruseles, etc.)
### 3.3 Tono y voz de la marca
## 4. CALENDARIO EDITORIAL (plan mensual)
## 5. ESTRATEGIA DE CRECIMIENTO DE COMUNIDAD
### 5.1 Técnicas de crecimiento orgánico
### 5.2 Colaboraciones y alianzas
## 6. CONTENIDO VIRAL: FÓRMULAS Y EJEMPLOS
## 7. KPIs DE REDES SOCIALES
## 8. PLAN DE LOS PRIMEROS 90 DÍAS
## 9. HERRAMIENTAS Y RECURSOS RECOMENDADOS

La estrategia debe ser visual, con ejemplos concretos de publicaciones y tendencias 2024-2025.`,

      plan_trabajo: `
Genera un PLAN DE TRABAJO PROFESIONAL completo con estas secciones:

## 1. DEFINICIÓN DEL PROYECTO
### 1.1 Alcance y límites
### 1.2 Entregables principales
## 2. OBJETIVOS SMART
### 2.1 Objetivo General
### 2.2 Objetivos Específicos (medibles y con plazo)
## 3. ESTRUCTURA DE DESGLOSE DE TRABAJO (EDT)
## 4. CRONOGRAMA DE ACTIVIDADES (Gantt)
## 5. ASIGNACIÓN DE ROLES Y RESPONSABILIDADES
## 6. RECURSOS NECESARIOS
### 6.1 Recursos humanos
### 6.2 Recursos tecnológicos y materiales
### 6.3 Presupuesto estimado
## 7. INDICADORES DE PROGRESO (KPIs)
## 8. GESTIÓN DE RIESGOS
### 8.1 Riesgos identificados
### 8.2 Plan de contingencia
## 9. HITOS Y FECHAS CLAVE
## 10. REFERENCIAS METODOLÓGICAS (PMI, Agile, etc.)

El plan debe ser detallado, profesional y listo para presentar a un equipo o cliente.`,

      tutela: `
Actúa como un abogado experto en derecho colombiano especializado en acciones de tutela.
Genera una ACCIÓN DE TUTELA completa, jurídicamente fundamentada, lista para radicar.

El documento debe incluir obligatoriamente:

## ENCABEZADO
(Señor Juez Civil/Penal/Laboral Municipal o del Circuito de [Ciudad] — en reparto)

## I. IDENTIFICACIÓN DE LAS PARTES
### Accionante
### Accionado

## II. HECHOS
(Numerados, en orden cronológico, concretos y precisos)

## III. DERECHOS FUNDAMENTALES VULNERADOS
(Con artículos exactos de la Constitución Política de Colombia)

## IV. FUNDAMENTOS JURÍDICOS
### Normas constitucionales aplicables
### Normas legales y decretos
### Jurisprudencia de la Corte Constitucional (citar sentencias reales aplicables: T-xxx/año, SU-xxx/año)

## V. PRETENSIONES
(Numeradas, claras y ejecutables por el juez)

## VI. PRUEBAS
(Lista de documentos y evidencias que respaldan la tutela)

## VII. JURAMENTO
(Afirmación de que los hechos son verídicos)

## VIII. NOTIFICACIONES
(Dirección o correo para notificaciones)

## IX. COMPETENCIA
(Justificación del juez competente)

## FIRMA Y DATOS DEL ACCIONANTE

---
REGLAS OBLIGATORIAS:
- Cita artículos REALES de la Constitución Política de Colombia (1991)
- Cita sentencias REALES de la Corte Constitucional (T-, SU-, C-)
- El lenguaje debe ser jurídico, formal y preciso
- Las pretensiones deben ser ejecutables (el juez puede ordenarlas)
- Si la información de hechos es incompleta, usa los datos disponibles y señala [COMPLETAR: ...]
- El documento debe estar listo para presentar ante un despacho judicial colombiano`,

      default: `
Genera el documento con estas secciones numeradas:

## 1. TÍTULO DEL PROYECTO
## 2. PLANTEAMIENTO DEL PROBLEMA
## 3. JUSTIFICACIÓN
## 4. OBJETIVOS
### 4.1 Objetivo General
### 4.2 Objetivos Específicos
## 5. MARCO TEÓRICO (resumen de conceptos clave)
## 6. METODOLOGÍA
## 7. CRONOGRAMA ESTIMADO
## 8. RESULTADOS ESPERADOS
## 9. REFERENCIAS BIBLIOGRÁFICAS (mínimo 5, formato APA 7)

El proyecto debe ser coherente, original y adaptado exactamente al contexto proporcionado.`,
    };

    return estructuras[tipoServicio] || estructuras['default'];
  }
}
