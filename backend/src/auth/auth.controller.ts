import {
  Controller, Post, Get, Put, Delete, Body, Param,
  UseGuards, Request, HttpCode, ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  async registro(@Body() body: { nombre: string; email: string; password: string; recaptchaToken?: string }) {
    const data = await this.authService.registro(body.nombre, body.email, body.password, body.recaptchaToken);
    return { success: true, data };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string }) {
    const data = await this.authService.login(body.email, body.password);
    return { success: true, data };
  }

  @Get('perfil')
  @UseGuards(AuthGuard('jwt'))
  perfil(@Request() req: any) {
    const { password, ...usuario } = req.user;
    return { success: true, data: usuario };
  }

  // Verificar correo con token
  @Get('verificar/:token')
  async verificarEmail(@Param('token') token: string) {
    const data = await this.authService.verificarEmail(token);
    return { success: true, data, message: '¡Correo verificado! Ya puedes usar la plataforma.' };
  }

  // Actualizar perfil (correo, contraseña, nombre)
  @Put('actualizar-perfil')
  async actualizarPerfil(@Body() body: { emailActual: string; nuevoEmail?: string; nuevaPassword?: string; nuevoNombre?: string }) {
    const data = await this.authService.actualizarPerfil(body.emailActual, body.nuevoEmail, body.nuevaPassword, body.nuevoNombre);
    return { success: true, data, message: 'Perfil actualizado correctamente' };
  }

  // Crear cuenta admin (solo funciona si no existe ningún admin todavía)
  @Post('setup-admin')
  async setupAdmin(@Body() body: { nombre: string; email: string; password: string; codigoSetup: string }) {
    if (body.codigoSetup !== 'ML-ADMIN-2024') {
      throw new ForbiddenException('Código de setup incorrecto');
    }
    const data = await this.authService.registroAdmin(body.nombre, body.email, body.password);
    return { success: true, data };
  }

  // Admin: listar todos los usuarios
  @Get('usuarios')
  @UseGuards(AuthGuard('jwt'))
  async listarUsuarios(@Request() req: any) {
    if (req.user.rol !== 'admin') throw new ForbiddenException('Solo administradores');
    const data = await this.authService.listarUsuarios();
    return { success: true, data };
  }

  // Admin: eliminar usuario
  @Delete('usuarios/:id')
  @UseGuards(AuthGuard('jwt'))
  async eliminarUsuario(@Param('id') id: string, @Request() req: any) {
    if (req.user.rol !== 'admin') throw new ForbiddenException('Solo administradores');
    await this.authService.eliminarUsuario(id);
    return { success: true, message: 'Usuario eliminado' };
  }
}
