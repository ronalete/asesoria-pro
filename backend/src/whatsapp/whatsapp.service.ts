import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../claude/claude.service';
import Anthropic from '@anthropic-ai/sdk';

// Historial de conversaciones por número de teléfono (en memoria)
interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private conversaciones = new Map<string, Mensaje[]>();

  constructor(private readonly claudeService: ClaudeService) {}

  async procesarMensaje(de: string, texto: string): Promise<string> {
    // Obtener o iniciar historial de conversación
    if (!this.conversaciones.has(de)) {
      this.conversaciones.set(de, []);
    }
    const historial = this.conversaciones.get(de)!;

    // Si el usuario saluda, reiniciar conversación
    const saludos = ['hola', 'hi', 'hello', 'buenas', 'buenos', 'inicio', 'start', 'comenzar'];
    if (saludos.some(s => texto.toLowerCase().trim().startsWith(s)) && historial.length === 0) {
      const bienvenida = this.mensajeBienvenida();
      historial.push({ role: 'assistant', content: bienvenida });
      return bienvenida;
    }

    // Agregar mensaje del usuario al historial
    historial.push({ role: 'user', content: texto });

    // Limitar historial a los últimos 10 mensajes para no exceder tokens
    const historialReciente = historial.slice(-10);

    // Construir prompt con contexto del negocio
    const systemPrompt = `Eres AsesorIA, el asistente virtual de M&L Profesionales, creado por el Ingeniero Ronald Yesid.

Tu función es ayudar a clientes con sus requerimientos de asesoría profesional. Ofreces estos servicios:

1. 💰 *Beneficio Financiero* — Análisis y estrategias para mejorar la situación financiera de empresas
2. 📣 *Plan de Pauta* — Estrategias de publicidad y marketing para llegar a más audiencia
3. 📱 *Impacto en Redes* — Estrategias para crecer en redes sociales y aumentar seguidores
4. 📋 *Plan de Trabajo* — Planificación y organización de proyectos empresariales
5. 📄 *Formulación de Documentos* — Redacción de documentos académicos, empresariales y oficiales
6. ⚖️ *Estructurar Tutela* — Elaboración de acciones de tutela (Colombia) para proteger derechos fundamentales
7. 🔍 *Detector Plagio/IA* — Análisis de textos para detectar contenido IA o plagio

Reglas:
- Responde siempre en español
- Sé conciso (máximo 3-4 párrafos por respuesta, es WhatsApp)
- Usa emojis moderadamente para hacer el chat más amigable
- Si el cliente quiere contratar un servicio, pídele su nombre, correo y describe brevemente su necesidad
- Al final de cada consulta orienta al cliente a visitar la plataforma o contactar directamente
- No inventes información técnica o legal específica, orienta a consultar con los especialistas

Plataforma: https://asesoria-ml.com (o el dominio que corresponda)
Contacto: ingeniería Ronald Yesid`;

    try {
      // Llamar a Claude con historial
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const mensajesAPI: Anthropic.MessageParam[] = historialReciente.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const respuesta = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-opus-4-5',
        max_tokens: 500,
        system: systemPrompt,
        messages: mensajesAPI,
      });

      const textoRespuesta = respuesta.content[0].type === 'text'
        ? respuesta.content[0].text
        : 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.';

      // Agregar respuesta al historial
      historial.push({ role: 'assistant', content: textoRespuesta });

      // Limpiar conversaciones muy largas (> 50 mensajes)
      if (historial.length > 50) {
        this.conversaciones.set(de, historial.slice(-20));
      }

      this.logger.log(`Mensaje procesado para ${de}: ${texto.substring(0, 50)}...`);
      return textoRespuesta;

    } catch (error) {
      this.logger.error('Error procesando mensaje WhatsApp:', error);
      return '⚠️ Hubo un error procesando tu mensaje. Por favor intenta de nuevo en un momento.';
    }
  }

  private mensajeBienvenida(): string {
    return `👋 ¡Hola! Bienvenido a *M&L Profesionales*.

Soy *AsesorIA*, tu asistente virtual creado por el *Ing. Ronald Yesid* para ayudarte con todos tus requerimientos de asesoría.

Puedo ayudarte con:
💰 Beneficio Financiero
📣 Plan de Pauta
📱 Impacto en Redes
📋 Plan de Trabajo
📄 Formulación de Documentos
⚖️ Tutelas
🔍 Detector Plagio/IA

¿Sobre cuál de estos servicios te gustaría recibir asesoría hoy? 😊`;
  }

  limpiarConversacion(numero: string): void {
    this.conversaciones.delete(numero);
  }
}
