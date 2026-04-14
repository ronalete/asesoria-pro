import { Component, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-popup-bienvenida',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <!-- Overlay -->
  <div class="animate-fade-in" style="position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);padding:16px">

    <div class="animate-slide-up" style="position:relative;width:100%;max-width:680px;border-radius:24px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,0.9)">

      <!-- Barra gradiente top -->
      <div style="height:4px;background:linear-gradient(90deg,#10B981,#3B82F6,#8B5CF6,#E11D48)"></div>

      <!-- Imagen fondo -->
      <div style="position:relative;min-height:380px;overflow:hidden">
        <img src="imagen1.jpeg" alt="M&L Profesionales"
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center">

        <!-- Overlay oscuro sobre imagen -->
        <div style="position:absolute;inset:0;background:linear-gradient(160deg,rgba(5,8,15,0.92) 0%,rgba(5,8,15,0.7) 50%,rgba(5,8,15,0.85) 100%)"></div>

        <!-- Botón cerrar -->
        <button (click)="cerrar()"
          style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:white;border-radius:50%;width:38px;height:38px;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);transition:background 0.2s;z-index:10"
          (mouseenter)="$event.currentTarget['style'].background='rgba(255,255,255,0.2)'"
          (mouseleave)="$event.currentTarget['style'].background='rgba(255,255,255,0.1)'">×</button>

        <!-- Contenido -->
        <div style="position:relative;z-index:2;padding:48px 48px 40px">

          <!-- Badge -->
          <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.15);border:1px solid #10B98140;border-radius:20px;padding:6px 14px;margin-bottom:20px">
            <span style="width:7px;height:7px;border-radius:50%;background:#10B981;box-shadow:0 0 8px #10B981;flex-shrink:0"></span>
            <span style="font-size:10px;color:#10B981;font-weight:700;letter-spacing:0.1em">BIENVENIDO A M&L PROFESIONALES</span>
          </div>

          <!-- Título -->
          <h1 style="font-size:clamp(24px,4vw,40px);font-weight:900;color:#F8FAFC;margin:0 0 14px;line-height:1.15;letter-spacing:-1.5px">
            Tu asesoría profesional<br>
            <span style="background:linear-gradient(135deg,#10B981,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">impulsada por IA</span>
          </h1>

          <!-- Descripción -->
          <p style="font-size:14px;color:#94A3B8;margin:0 0 28px;line-height:1.8;max-width:440px">
            Trabajos académicos, análisis empresariales, tutelas y detección de plagio — todo en un solo lugar, con los estándares más altos y en minutos.
          </p>

          <!-- Beneficios -->
          <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:32px">
            <div *ngFor="let b of beneficios" style="display:flex;align-items:center;gap:8px">
              <span [style]="'font-size:18px;color:' + b.color">{{b.icon}}</span>
              <span style="font-size:12px;color:#CBD5E1;font-weight:600">{{b.text}}</span>
            </div>
          </div>

          <!-- Botones -->
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button (click)="cerrar()"
              style="background:linear-gradient(135deg,#10B981,#059669);border:none;color:white;padding:14px 28px;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 8px 24px #10B98140;letter-spacing:-0.3px">
              🚀 Comenzar ahora
            </button>
            <a href="https://wa.me/573023970173?text=Hola,%20quiero%20información%20sobre%20sus%20servicios" target="_blank"
              style="background:rgba(37,211,102,0.15);border:1px solid #25D36640;color:#25D366;padding:14px 24px;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;display:flex;align-items:center;gap:8px">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#080A0E;padding:14px 48px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <img src="myl-logo.jpeg" alt="ML" style="width:28px;height:28px;border-radius:8px;object-fit:cover"
            onerror="this.style.display='none'">
          <span style="font-size:11px;color:#334155;font-weight:600">Ing. Ronald Yesid · AsesorIA Pro v2.0</span>
        </div>
        <button (click)="cerrar()" style="background:none;border:none;color:#334155;font-size:11px;cursor:pointer;font-family:inherit;text-decoration:underline">
          No mostrar de nuevo
        </button>
      </div>
    </div>
  </div>
  `
})
export class PopupBienvenidaComponent {
  cerrado = output<void>();

  beneficios = [
    { icon: '📚', text: 'Trabajos académicos', color: '#3B82F6' },
    { icon: '🏢', text: 'Análisis empresarial', color: '#10B981' },
    { icon: '⚖️', text: 'Tutelas',             color: '#E11D48' },
    { icon: '🔍', text: 'Detector de plagio',  color: '#F97316' },
  ];

  cerrar() {
    localStorage.setItem('popup_visto', '1');
    this.cerrado.emit();
  }
}
