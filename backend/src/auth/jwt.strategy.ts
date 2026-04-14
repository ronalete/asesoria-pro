import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'asesoria-ml-secret-2024',
    });
  }

  async validate(payload: { sub: string }) {
    const usuario = await this.authService.validarToken(payload);
    if (!usuario) throw new UnauthorizedException('Token inválido');
    return usuario;
  }
}
