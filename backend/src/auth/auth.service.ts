import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Usuario } from './entities/usuario.entity';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private async verificarRecaptcha(token: string): Promise<void> {
    try {
      const secret = process.env.RECAPTCHA_SECRET;
      const res = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secret}&response=${token}`,
      });
      const data: any = await res.json();
      if (!data.success) throw new BadRequestException('Verificación reCAPTCHA fallida. Inténtalo de nuevo.');
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      // Si falla la conexión con Google, permitir continuar en desarrollo
    }
  }

  async registro(nombre: string, email: string, password: string, recaptchaToken?: string) {
    if (recaptchaToken) await this.verificarRecaptcha(recaptchaToken);

    const existe = await this.usuarioRepo.findOne({ where: { email: email.toLowerCase() } });
    if (existe) throw new ConflictException('Ese correo ya tiene una cuenta registrada. Inicia sesión o usa otro correo.');

    const hash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');

    const usuario = this.usuarioRepo.create({
      nombre,
      email: email.toLowerCase(),
      password: hash,
      rol: 'user',
      verificado: false,
      tokenVerificacion: token,
    });
    await this.usuarioRepo.save(usuario);

    // Enviar correo de verificación
    await this.emailService.enviarVerificacion(usuario.email, nombre, token);

    return {
      mensaje: `Hemos enviado un enlace de verificación a ${email}. Revisa tu bandeja de entrada.`,
      emailEnviado: true,
    };
  }

  async verificarEmail(token: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { tokenVerificacion: token } });
    if (!usuario) throw new BadRequestException('Enlace de verificación inválido o expirado');
    if (usuario.verificado) throw new BadRequestException('Esta cuenta ya fue verificada');

    usuario.verificado = true;
    usuario.tokenVerificacion = undefined as any;
    await this.usuarioRepo.save(usuario);

    // Enviar correo de bienvenida
    await this.emailService.enviarBienvenida(usuario.email, usuario.nombre);

    return this.generarToken(usuario);
  }

  async registroAdmin(nombre: string, email: string, password: string) {
    const existeAdmin = await this.usuarioRepo.findOne({ where: { rol: 'admin' } });
    if (existeAdmin) throw new ConflictException('Ya existe un administrador en el sistema');

    const existe = await this.usuarioRepo.findOne({ where: { email: email.toLowerCase() } });
    if (existe) throw new ConflictException('Ya existe una cuenta con ese correo');

    const hash = await bcrypt.hash(password, 10);
    const usuario = this.usuarioRepo.create({
      nombre,
      email: email.toLowerCase(),
      password: hash,
      rol: 'admin',
      verificado: true, // Admin no requiere verificación
    });
    await this.usuarioRepo.save(usuario);
    return this.generarToken(usuario);
  }

  async login(email: string, password: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!usuario) throw new UnauthorizedException('Correo o contraseña incorrectos');

    const valida = await bcrypt.compare(password, usuario.password);
    if (!valida) throw new UnauthorizedException('Correo o contraseña incorrectos');

    if (!usuario.verificado) {
      throw new UnauthorizedException('Debes verificar tu correo antes de ingresar. Revisa tu bandeja de entrada.');
    }

    return this.generarToken(usuario);
  }

  async validarToken(payload: { sub: string }): Promise<Usuario | null> {
    return this.usuarioRepo.findOne({ where: { id: payload.sub } });
  }

  async actualizarPerfil(emailActual: string, nuevoEmail?: string, nuevaPassword?: string, nuevoNombre?: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { email: emailActual.toLowerCase() } });
    if (!usuario) throw new BadRequestException('Usuario no encontrado');

    if (nuevoEmail && nuevoEmail.toLowerCase() !== emailActual.toLowerCase()) {
      const existe = await this.usuarioRepo.findOne({ where: { email: nuevoEmail.toLowerCase() } });
      if (existe) throw new ConflictException('Ese correo ya está en uso');
      usuario.email = nuevoEmail.toLowerCase();
    }
    if (nuevaPassword) {
      usuario.password = await bcrypt.hash(nuevaPassword, 10);
    }
    if (nuevoNombre) {
      usuario.nombre = nuevoNombre;
    }
    await this.usuarioRepo.save(usuario);
    return this.generarToken(usuario);
  }

  async listarUsuarios() {
    const usuarios = await this.usuarioRepo.find({ order: { creadoEn: 'DESC' } });
    return usuarios.map(({ password, tokenVerificacion, ...u }) => u);
  }

  async eliminarUsuario(id: string) {
    await this.usuarioRepo.delete(id);
  }

  private generarToken(usuario: Usuario) {
    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    return {
      token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        verificado: usuario.verificado,
      },
    };
  }
}
