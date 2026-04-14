import {
  Controller, Post, Get, Body, Query, Res, Logger, HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { WhatsappService } from './whatsapp.service';

// ─── Twilio webhook ──────────────────────────────────────────────────────────
// Twilio envía los mensajes como form-urlencoded al webhook POST /api/v1/whatsapp/webhook
// Twilio verifica el webhook con GET /api/v1/whatsapp/webhook (no requiere verificación, solo 200)

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  // Verificación simple de que el webhook existe (Twilio no requiere token)
  @Get('webhook')
  verificar(@Res() res: Response) {
    res.status(200).send('OK');
  }

  // Recibir mensajes de Twilio WhatsApp Sandbox
  // Content-Type: application/x-www-form-urlencoded
  @Post('webhook')
  @HttpCode(200)
  async recibirMensaje(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      const numero = body['From'] || '';       // e.g. "whatsapp:+573001234567"
      const texto = body['Body'] || '';
      const profileName = body['ProfileName'] || 'Cliente';

      this.logger.log(`Mensaje de ${profileName} (${numero}): ${texto}`);

      if (!texto.trim()) {
        // Si no hay texto (puede ser imagen, audio, etc.)
        res.set('Content-Type', 'text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Lo siento, por ahora solo puedo procesar mensajes de texto. 📝</Message>
</Response>`);
        return;
      }

      const respuesta = await this.whatsappService.procesarMensaje(numero, texto);

      // Respuesta en formato TwiML (Twilio Markup Language)
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(respuesta)}</Message>
</Response>`);

    } catch (error) {
      this.logger.error('Error en webhook WhatsApp:', error);
      res.set('Content-Type', 'text/xml');
      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>⚠️ Error interno. Intenta de nuevo.</Message>
</Response>`);
    }
  }

  // Endpoint para probar el bot desde el navegador/Postman
  @Post('test')
  async testMensaje(@Body() body: { numero?: string; mensaje: string }) {
    const numero = body.numero || 'test-user';
    const respuesta = await this.whatsappService.procesarMensaje(numero, body.mensaje);
    return { success: true, respuesta };
  }

  // Limpiar historial de conversación
  @Post('limpiar')
  limpiarConversacion(@Body() body: { numero: string }) {
    this.whatsappService.limpiarConversacion(body.numero);
    return { success: true, message: 'Conversación limpiada' };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
