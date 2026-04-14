import {
  Component, inject, signal, output, OnInit, AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';

declare const grecaptcha: any;

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <!-- Overlay -->
  <div style="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);padding:16px"
    (click)="cerrado.emit()">

    <div class="animate-slide-up" style="background:#0F1117;border:1px solid #1E2530;border-radius:24px;width:100%;max-width:440px;overflow:hidden;position:relative;box-shadow:0 32px 100px rgba(0,0,0,0.8)"
      (click)="$event.stopPropagation()">

      <!-- Barra superior gradiente -->
      <div style="height:3px;background:linear-gradient(90deg,#10B981,#3B82F6,#8B5CF6)"></div>

      <!-- Botón cerrar -->
      <button (click)="cerrado.emit()"
        (mouseenter)="hoveredClose.set(true)" (mouseleave)="hoveredClose.set(false)"
        [style]="'position:absolute;top:14px;right:14px;background:#1E2530;border:1px solid #2D3748;border-radius:10px;width:34px;height:34px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;z-index:2;transition:all 0.2s;color:' + (hoveredClose() ? '#E2E8F0' : '#64748B')">×</button>

      <div style="padding:32px">
        <!-- Logo -->
        <div style="text-align:center;margin-bottom:28px">
          <img src="myl-logo.jpeg" alt="M&L Logo"
            style="width:64px;height:64px;border-radius:16px;object-fit:cover;margin:0 auto 14px;display:block;border:2px solid #1E2530"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#10B981,#3B82F6);display:none;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:white;margin:0 auto 14px;letter-spacing:-1px">ML</div>
          <div style="font-size:20px;font-weight:800;color:#F1F5F9;letter-spacing:-0.5px">M&L Profesionales</div>
          <div style="font-size:12px;color:#475569;margin-top:5px">
            {{modo() === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratis'}}
          </div>
        </div>

        <!-- Error -->
        <div *ngIf="error()" class="animate-fade-in" style="background:#1A0808;border:1px solid #7F1D1D40;border-radius:12px;padding:11px 14px;font-size:12px;color:#FCA5A5;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <span style="font-size:16px;flex-shrink:0">⚠️</span> {{error()}}
        </div>

        <!-- Éxito -->
        <div *ngIf="exito()" class="animate-fade-in" style="background:#0A1F15;border:1px solid #10B98140;border-radius:12px;padding:11px 14px;font-size:12px;color:#6EE7B7;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <span style="font-size:16px;flex-shrink:0">✅</span> {{exito()}}
        </div>

        <!-- Campo nombre (solo registro) -->
        <div *ngIf="modo() === 'registro'" style="margin-bottom:14px">
          <label style="font-size:10px;color:#475569;font-weight:700;display:block;margin-bottom:7px;letter-spacing:0.08em;text-transform:uppercase">Nombre completo</label>
          <input [(ngModel)]="nombre" type="text" placeholder="Ej: Juan Pérez"
            style="width:100%;background:#080A0E;border:1px solid #1E2530;border-radius:12px;padding:12px 14px;font-size:13px;color:#E2E8F0;font-family:inherit;outline:none;box-sizing:border-box;transition:border-color 0.2s"
            (focus)="$event.target['style'].borderColor='#10B981'"
            (blur)="$event.target['style'].borderColor='#1E2530'">
        </div>

        <!-- Campo correo -->
        <div style="margin-bottom:14px">
          <label style="font-size:10px;color:#475569;font-weight:700;display:block;margin-bottom:7px;letter-spacing:0.08em;text-transform:uppercase">Correo electrónico</label>
          <input [(ngModel)]="email" type="email" placeholder="correo@ejemplo.com"
            style="width:100%;background:#080A0E;border:1px solid #1E2530;border-radius:12px;padding:12px 14px;font-size:13px;color:#E2E8F0;font-family:inherit;outline:none;box-sizing:border-box;transition:border-color 0.2s"
            (focus)="$event.target['style'].borderColor='#10B981'"
            (blur)="$event.target['style'].borderColor='#1E2530'">
        </div>

        <!-- Campo contraseña -->
        <div style="margin-bottom:20px">
          <label style="font-size:10px;color:#475569;font-weight:700;display:block;margin-bottom:7px;letter-spacing:0.08em;text-transform:uppercase">Contraseña</label>
          <input [(ngModel)]="password" type="password" placeholder="Mínimo 6 caracteres"
            style="width:100%;background:#080A0E;border:1px solid #1E2530;border-radius:12px;padding:12px 14px;font-size:13px;color:#E2E8F0;font-family:inherit;outline:none;box-sizing:border-box;transition:border-color 0.2s"
            (focus)="$event.target['style'].borderColor='#10B981'"
            (blur)="$event.target['style'].borderColor='#1E2530'"
            (keydown.enter)="enviar()">
        </div>

        <!-- reCAPTCHA (solo registro) -->
        <div *ngIf="modo() === 'registro'" style="margin-bottom:20px;display:flex;justify-content:center">
          <div id="recaptcha-container"></div>
        </div>

        <!-- Botón principal -->
        <button (click)="enviar()" [disabled]="cargando()"
          style="width:100%;background:linear-gradient(135deg,#10B981,#059669);border:none;border-radius:14px;padding:14px;font-size:14px;font-weight:700;color:white;cursor:pointer;font-family:inherit;letter-spacing:-0.3px;transition:opacity 0.2s,transform 0.1s"
          [style.opacity]="cargando() ? '0.7' : '1'"
          (mouseenter)="hoveredBtn.set(true)" (mouseleave)="hoveredBtn.set(false)"
          [style.transform]="hoveredBtn() ? 'scale(1.01)' : 'scale(1)'">
          <span *ngIf="!cargando()">{{modo() === 'login' ? '→ Iniciar sesión' : '✓ Crear cuenta'}}</span>
          <span *ngIf="cargando()" style="display:flex;align-items:center;justify-content:center;gap:8px">
            <span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;display:inline-block;animation:rotate-slow 0.8s linear infinite"></span>
            Procesando...
          </span>
        </button>

        <!-- Cambiar modo -->
        <div style="text-align:center;margin-top:18px">
          <span style="font-size:12px;color:#334155">
            {{modo() === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}}
          </span>
          <button (click)="cambiarModo()" style="background:none;border:none;color:#10B981;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-left:6px;text-decoration:underline">
            {{modo() === 'login' ? 'Regístrate gratis' : 'Inicia sesión'}}
          </button>
        </div>
      </div>
    </div>
  </div>
  `
})
export class AuthModalComponent implements AfterViewInit {
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  cerrado = output<void>();

  modo       = signal<'login' | 'registro'>('login');
  cargando   = signal(false);
  error      = signal('');
  exito      = signal('');
  hoveredClose = signal(false);
  hoveredBtn   = signal(false);

  nombre   = '';
  email    = '';
  password = '';
  recaptchaToken = '';
  recaptchaWidgetId: number | null = null;

  ngAfterViewInit() {
    if (this.modo() === 'registro') {
      setTimeout(() => this.renderRecaptcha(), 200);
    }
  }

  private renderRecaptcha() {
    try {
      if (typeof grecaptcha === 'undefined') return;
      const container = document.getElementById('recaptcha-container');
      if (!container || container.children.length > 0) return;

      this.recaptchaWidgetId = grecaptcha.render('recaptcha-container', {
        sitekey: '6LfdLLYsAAAAANep_2sIQFY9opvl_OGTC4Sdbc-k',
        theme: 'dark',
        callback: (token: string) => {
          this.zone.run(() => {
            this.recaptchaToken = token;
            this.cdr.markForCheck();
          });
        },
        'expired-callback': () => {
          this.zone.run(() => {
            this.recaptchaToken = '';
            this.cdr.markForCheck();
          });
        },
      });
    } catch (e) {
      // reCAPTCHA no disponible aún
    }
  }

  cambiarModo() {
    this.modo.set(this.modo() === 'login' ? 'registro' : 'login');
    this.error.set('');
    this.exito.set('');
    this.recaptchaToken = '';
    if (this.modo() === 'registro') {
      setTimeout(() => this.renderRecaptcha(), 300);
    }
  }

  enviar() {
    this.error.set('');
    if (!this.email || !this.password) { this.error.set('Completa todos los campos'); return; }
    if (this.modo() === 'registro') {
      if (!this.nombre) { this.error.set('Ingresa tu nombre completo'); return; }
      if (this.password.length < 6) { this.error.set('La contraseña debe tener al menos 6 caracteres'); return; }
      if (!this.recaptchaToken) { this.error.set('Completa la verificación reCAPTCHA'); return; }
    }

    this.cargando.set(true);

    const obs = this.modo() === 'login'
      ? this.authService.login(this.email, this.password)
      : this.authService.registro(this.nombre, this.email, this.password, this.recaptchaToken);

    obs.subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (this.modo() === 'registro') {
          this.exito.set('¡Cuenta creada! Revisa tu correo para verificarla.');
          setTimeout(() => this.cerrado.emit(), 3000);
        } else {
          this.exito.set('¡Bienvenido de vuelta!');
          setTimeout(() => this.cerrado.emit(), 800);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        const msg = err?.error?.message || 'Error al procesar la solicitud';
        this.error.set(Array.isArray(msg) ? msg[0] : msg);
        // Resetear reCAPTCHA en error
        if (this.modo() === 'registro' && this.recaptchaWidgetId !== null) {
          try { grecaptcha.reset(this.recaptchaWidgetId); } catch {}
          this.recaptchaToken = '';
        }
      }
    });
  }
}
