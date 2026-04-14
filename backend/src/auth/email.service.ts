import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async enviarVerificacion(email: string, nombre: string, token: string): Promise<void> {
    const urlBase = process.env.FRONTEND_URL || 'http://localhost:4200';
    const link = `${urlBase}/verificar?token=${token}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0E0E10;font-family:'Segoe UI',sans-serif">
      <div style="max-width:520px;margin:40px auto;background:#141416;border:1px solid #1E1E24;border-radius:16px;overflow:hidden">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#10B981,#3B82F6);padding:32px;text-align:center">
          <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:white;margin-bottom:12px">ML</div>
          <h1 style="color:white;margin:0;font-size:22px;font-weight:800">M&L Profesionales</h1>
          <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">AsesorIA — Plataforma de Asesoría con IA</p>
        </div>

        <!-- Body -->
        <div style="padding:32px">
          <h2 style="color:#F1F5F9;font-size:18px;margin:0 0 10px">Hola, ${nombre} 👋</h2>
          <p style="color:#94A3B8;font-size:14px;line-height:1.7;margin:0 0 24px">
            Gracias por registrarte. Para activar tu cuenta y comenzar a usar nuestros servicios,
            confirma tu correo electrónico haciendo clic en el botón:
          </p>

          <div style="text-align:center;margin:28px 0">
            <a href="${link}" style="background:linear-gradient(135deg,#10B981,#059669);color:white;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;display:inline-block">
              ✓ Verificar mi correo
            </a>
          </div>

          <p style="color:#475569;font-size:12px;line-height:1.6;margin:20px 0 0">
            Si no creaste esta cuenta, ignora este correo. El enlace expira en 24 horas.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;border-top:1px solid #1E1E24;text-align:center">
          <p style="color:#334155;font-size:11px;margin:0">
            M&L Profesionales · Creado por Ing. Ronald Yesid · AsesorIA Pro v2.0
          </p>
        </div>
      </div>
    </body>
    </html>`;

    try {
      await this.transporter.sendMail({
        from: `"M&L Profesionales" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '✅ Verifica tu cuenta en M&L Profesionales',
        html,
      });
      this.logger.log(`Correo de verificación enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando correo a ${email}:`, error);
      throw new Error('No se pudo enviar el correo de verificación');
    }
  }

  async enviarBienvenida(email: string, nombre: string): Promise<void> {
    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0E0E10;font-family:'Segoe UI',sans-serif">
      <div style="max-width:520px;margin:40px auto;background:#141416;border:1px solid #1E1E24;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#10B981,#3B82F6);padding:32px;text-align:center">
          <div style="font-size:40px;margin-bottom:8px">🎉</div>
          <h1 style="color:white;margin:0;font-size:22px;font-weight:800">¡Cuenta verificada!</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#F1F5F9;font-size:18px;margin:0 0 10px">Bienvenido, ${nombre}</h2>
          <p style="color:#94A3B8;font-size:14px;line-height:1.7;margin:0 0 16px">
            Tu cuenta ha sido activada exitosamente. Ya puedes acceder a todos nuestros servicios:
          </p>
          <ul style="color:#94A3B8;font-size:13px;line-height:2;padding-left:20px;margin:0 0 24px">
            <li>📚 Trabajos Académicos con normas APA e ICONTEC</li>
            <li>🔍 Detector de Plagio e IA</li>
            <li>🏢 Análisis para Empresas</li>
            <li>⚖️ Estructuración de Tutelas</li>
          </ul>
          <p style="color:#475569;font-size:12px;margin:0">
            Creado por <strong style="color:#E2E8F0">Ing. Ronald Yesid</strong> · M&L Profesionales
          </p>
        </div>
      </div>
    </body>
    </html>`;

    try {
      await this.transporter.sendMail({
        from: `"M&L Profesionales" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🎉 ¡Bienvenido a M&L Profesionales!',
        html,
      });
    } catch (error) {
      this.logger.warn(`No se pudo enviar correo de bienvenida a ${email}`);
    }
  }
}
