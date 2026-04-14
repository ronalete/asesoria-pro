import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

export interface UsuarioAuth {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private _usuario = signal<UsuarioAuth | null>(this.cargarUsuarioGuardado());
  private _token = signal<string | null>(localStorage.getItem('auth_token'));

  readonly usuario = this._usuario.asReadonly();
  readonly token = this._token.asReadonly();
  readonly estaAutenticado = computed(() => !!this._usuario());

  private cargarUsuarioGuardado(): UsuarioAuth | null {
    try {
      const data = localStorage.getItem('auth_usuario');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  registro(nombre: string, email: string, password: string, recaptchaToken?: string) {
    return this.http.post<any>(`${this.base}/auth/registro`, { nombre, email, password, recaptchaToken })
      .pipe(tap(res => { if (res.success && res.data?.token) this.guardarSesion(res.data); }));
  }

  login(email: string, password: string) {
    return this.http.post<any>(`${this.base}/auth/login`, { email, password })
      .pipe(tap(res => { if (res.success) this.guardarSesion(res.data); }));
  }

  cerrarSesion() {
    this._usuario.set(null);
    this._token.set(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_usuario');
  }

  getAuthHeaders(): { Authorization: string } | {} {
    const token = this._token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private guardarSesion(data: { token: string; usuario: UsuarioAuth }) {
    this._token.set(data.token);
    this._usuario.set(data.usuario);
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_usuario', JSON.stringify(data.usuario));
  }
}
