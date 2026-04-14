import {
  Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, interval, takeUntil, catchError, of, combineLatest } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FormuladorComponent } from '../../componentes/formulador/formulador';
import { ChatbotComponent } from '../../componentes/chatbot/chatbot';
import { AuthModalComponent } from '../../componentes/auth-modal/auth-modal';
import { PopupBienvenidaComponent } from '../../componentes/popup-bienvenida/popup-bienvenida';
import { AuthService } from '../../servicios/auth.service';

type TabPanel = 'home' | 'formulador' | 'chatbot' | 'admin';

const SERVICIOS_HOME = [
  {
    id: 'formulacion_docs',
    label: 'Trabajos Académicos',
    desc: 'Tesis, monografías, ensayos e informes con las últimas normas APA, ICONTEC y MLA.',
    color: '#3B82F6',
    grad: 'linear-gradient(135deg,#1e3a5f 0%,#1e40af 100%)',
    shadow: '#3B82F640',
    svg: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/>
      <line x1="9" y1="15" x2="12" y2="15"/>
    </svg>`,
    badge: 'APA · ICONTEC · MLA',
  },
  {
    id: 'detector',
    label: 'Detector Plagio / IA',
    desc: 'Detecta si tu documento fue generado por IA o contiene plagio, con recomendaciones precisas.',
    color: '#F97316',
    grad: 'linear-gradient(135deg,#431407 0%,#7c2d12 100%)',
    shadow: '#F9731640',
    svg: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <path d="M11 8v3l2 2"/>
    </svg>`,
    badge: 'Análisis en segundos',
  },
  {
    id: 'analisis_empresas',
    label: 'Análisis para Empresas',
    desc: 'Beneficio financiero, estrategias de marketing, impacto en redes y planes de trabajo.',
    color: '#10B981',
    grad: 'linear-gradient(135deg,#064e3b 0%,#065f46 100%)',
    shadow: '#10B98140',
    svg: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>`,
    badge: 'Finanzas · Marketing · Redes',
  },
  {
    id: 'tutela',
    label: 'Crear una Tutela',
    desc: 'Genera una acción de tutela completa, fundamentada en derecho colombiano y lista para radicar.',
    color: '#E11D48',
    grad: 'linear-gradient(135deg,#4c0519 0%,#881337 100%)',
    shadow: '#E11D4840',
    svg: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L3 7l9 5 9-5-9-5z"/>
      <path d="M3 12l9 5 9-5"/>
      <path d="M3 17l9 5 9-5"/>
    </svg>`,
    badge: 'Derecho colombiano',
  },
];

// Sub-servicios para "Análisis para Empresas"
const SUB_EMPRESAS = [
  { id: 'beneficio_financiero', label: 'Beneficio Financiero', icon: '💰', desc: 'Optimiza ingresos y reduce costos' },
  { id: 'pauta_marketing',      label: 'Plan de Pauta',        icon: '📣', desc: 'Estrategia de publicidad efectiva' },
  { id: 'redes_sociales',       label: 'Impacto en Redes',     icon: '📱', desc: 'Crece en redes sociales' },
  { id: 'plan_trabajo',         label: 'Plan de Trabajo',      icon: '📋', desc: 'Organiza tu proyecto con IA' },
];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, FormuladorComponent, ChatbotComponent, AuthModalComponent, PopupBienvenidaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div style="display:flex;min-height:100vh;background:#0A0A0C;font-family:'Segoe UI',system-ui,sans-serif;color:#E2E8F0">

    <!-- Popup bienvenida (primera visita) -->
    <app-popup-bienvenida *ngIf="mostrarPopup()" (cerrado)="mostrarPopup.set(false)"></app-popup-bienvenida>

    <!-- Botón flotante WhatsApp -->
    <a href="https://wa.me/573023970173?text=Hola,%20quiero%20información%20sobre%20sus%20servicios" target="_blank"
      (mouseenter)="hoveredWa.set(true)" (mouseleave)="hoveredWa.set(false)"
      [style]="'position:fixed;bottom:28px;right:28px;z-index:1500;width:58px;height:58px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(37,211,102,0.5);text-decoration:none;transition:transform 0.2s,box-shadow 0.2s;transform:' + (hoveredWa() ? 'scale(1.12)' : 'scale(1)') + ';box-shadow:' + (hoveredWa() ? '0 10px 36px rgba(37,211,102,0.7)' : '0 6px 24px rgba(37,211,102,0.5)')">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>

    <!-- Modal auth -->
    <app-auth-modal *ngIf="mostrarAuth()" (cerrado)="onAuthCerrado()"></app-auth-modal>

    <!-- Modal sub-empresas -->
    <div *ngIf="mostrarSubEmpresas()" style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:900;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)"
      (click)="mostrarSubEmpresas.set(false)">
      <div style="background:#141416;border:1px solid #1E1E24;border-radius:20px;padding:28px;max-width:460px;width:90%;position:relative" (click)="$event.stopPropagation()">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div>
            <div style="font-size:16px;font-weight:800;color:#F1F5F9">Análisis para Empresas</div>
            <div style="font-size:11px;color:#475569;margin-top:2px">Selecciona el tipo de análisis</div>
          </div>
          <button (click)="mostrarSubEmpresas.set(false)" style="background:#1E1E24;border:none;color:#64748B;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center">×</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div *ngFor="let sub of SUB_EMPRESAS" (click)="seleccionarSubEmpresa(sub.id)"
            (mouseenter)="hoveredSub.set(sub.id)" (mouseleave)="hoveredSub.set('')"
            [style]="'background:#0E0E10;border:1px solid ' + (hoveredSub()===sub.id ? '#10B981' : '#1E1E24') + ';border-radius:12px;padding:14px;cursor:pointer;transition:border-color 0.2s'">
            <div style="font-size:22px;margin-bottom:8px">{{sub.icon}}</div>
            <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:3px">{{sub.label}}</div>
            <div style="font-size:11px;color:#475569">{{sub.desc}}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ SIDEBAR ══ -->
    <div style="width:210px;background:#0D0D0F;border-right:1px solid #18181C;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;z-index:10">

      <!-- Logo -->
      <div style="padding:20px 16px 16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:42px;height:42px;border-radius:12px;overflow:hidden;flex-shrink:0;border:1px solid #1E2530">
            <img src="myl-logo.jpeg" alt="ML" style="width:100%;height:100%;object-fit:cover"
              onerror="this.parentElement.style.background='linear-gradient(135deg,#10B981,#3B82F6)';this.style.display='none'">
          </div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#F1F5F9;letter-spacing:-0.3px">M&L</div>
            <div style="font-size:9px;color:#334155;letter-spacing:0.08em;text-transform:uppercase">Profesionales</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;background:#0D2015;border:1px solid #10B98125;border-radius:8px;padding:6px 10px">
          <span style="width:7px;height:7px;border-radius:50%;background:#10B981;flex-shrink:0;box-shadow:0 0 8px #10B981;animation:pulse-glow 2s ease-in-out infinite"></span>
          <span style="font-size:9px;color:#10B981;font-weight:700;letter-spacing:0.06em">AGENTE ACTIVO</span>
        </div>
      </div>

      <!-- Nav -->
      <div style="display:flex;flex-direction:column;gap:2px;padding:0 10px;flex:1">
        <div style="font-size:9px;color:#1E293B;letter-spacing:0.12em;font-weight:700;text-transform:uppercase;padding:8px 8px 4px">MENÚ</div>
        <button (click)="tabActiva.set('home')" [style]="tabActiva()==='home' ? navActive : navBase">
          <span style="font-size:16px">🏠</span> <span>Inicio</span>
        </button>
        <button (click)="irAMisConsultas()" [style]="tabActiva()==='formulador' ? navActive : navBase">
          <span style="font-size:16px">✨</span> <span>Mis consultas</span>
        </button>
        <button (click)="tabActiva.set('chatbot')" [style]="tabActiva()==='chatbot' ? navActive : navBase">
          <span style="font-size:16px">💬</span> <span>Chat con IA</span>
        </button>
        <ng-container *ngIf="auth.usuario()?.rol === 'admin'">
          <div style="height:1px;background:#18181C;margin:10px 4px"></div>
          <div style="font-size:9px;color:#1E293B;letter-spacing:0.12em;font-weight:700;text-transform:uppercase;padding:4px 8px">SISTEMA</div>
          <button (click)="tabActiva.set('admin')" [style]="tabActiva()==='admin' ? navActive : navBase">
            <span style="font-size:16px">⚙️</span> <span>Admin</span>
          </button>
        </ng-container>
      </div>

      <!-- Usuario / sesión -->
      <div style="padding:14px 16px;border-top:1px solid #18181C">
        <!-- Autenticado -->
        <ng-container *ngIf="auth.estaAutenticado()">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#10B981,#3B82F6);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0">
              {{auth.usuario()!.nombre.charAt(0).toUpperCase()}}
            </div>
            <div style="min-width:0">
              <div style="font-size:11px;font-weight:700;color:#E2E8F0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{auth.usuario()!.nombre}}</div>
              <div style="font-size:9px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{auth.usuario()!.email}}</div>
            </div>
          </div>
          <button (click)="auth.cerrarSesion()" style="width:100%;background:#1A0A0A;border:1px solid #3F1212;color:#F87171;border-radius:8px;padding:6px;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit">
            Cerrar sesión
          </button>
        </ng-container>
        <!-- No autenticado -->
        <ng-container *ngIf="!auth.estaAutenticado()">
          <button (click)="mostrarAuth.set(true)" style="width:100%;background:linear-gradient(135deg,#10B981,#059669);border:none;color:white;border-radius:8px;padding:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:6px">
            Iniciar sesión
          </button>
          <div style="font-size:9px;color:#334155;text-align:center">Ing. Ronald Yesid · AsesorIA Pro v2.0</div>
        </ng-container>
      </div>
    </div>

    <!-- ══ CONTENIDO PRINCIPAL ══ -->
    <div style="flex:1;display:flex;flex-direction:column;min-width:0;overflow-y:auto">

      <!-- ─── HOME ─── -->
      <ng-container *ngIf="tabActiva()==='home'">

        <!-- ══ HERO con imagen de fondo ══ -->
        <div style="position:relative;min-height:420px;overflow:hidden;display:flex;align-items:center">

          <!-- Imagen fondo oficina -->
          <img src="imagen1.jpeg" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;filter:brightness(0.18) saturate(0.6)">

          <!-- Overlay gradiente -->
          <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(10,14,26,0.95) 0%,rgba(10,10,12,0.8) 60%,rgba(16,185,129,0.08) 100%)"></div>

          <!-- Partículas decorativas -->
          <div style="position:absolute;top:20%;right:15%;width:180px;height:180px;border-radius:50%;border:1px solid #10B98115;animation:rotate-slow 20s linear infinite"></div>
          <div style="position:absolute;top:30%;right:20%;width:100px;height:100px;border-radius:50%;border:1px solid #3B82F615;animation:rotate-slow 15s linear infinite reverse"></div>

          <!-- Contenido hero -->
          <div style="position:relative;z-index:2;padding:60px 44px;width:100%;max-width:900px;margin:0 auto;box-sizing:border-box">

            <!-- Badge -->
            <div class="animate-fade-in" style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.1);border:1px solid #10B98130;border-radius:20px;padding:6px 14px;margin-bottom:20px">
              <span style="width:7px;height:7px;border-radius:50%;background:#10B981;box-shadow:0 0 10px #10B981;flex-shrink:0"></span>
              <span style="font-size:11px;color:#10B981;font-weight:700;letter-spacing:0.08em">AGENTE IA ACTIVO — M&L PROFESIONALES</span>
            </div>

            <!-- Título -->
            <h1 class="animate-slide-up" style="font-size:clamp(28px,4vw,48px);font-weight:900;color:#F8FAFC;margin:0 0 16px;line-height:1.15;letter-spacing:-1.5px;max-width:600px">
              Hola, bienvenido a<br>
              <span class="gradient-text">Asesorías Profesionales</span><br>
              <span style="color:#94A3B8;font-size:0.65em;font-weight:600;letter-spacing:-0.5px">M&L — Impulsado por Inteligencia Artificial</span>
            </h1>

            <!-- Descripción -->
            <p class="animate-slide-up" style="font-size:15px;color:#64748B;margin:0 0 32px;line-height:1.8;max-width:520px">
              Soy un agente creado por el <strong style="color:#94A3B8">Ing. Ronald Yesid</strong> para solucionar tus requerimientos con la más alta calidad, precisión y las normas más actualizadas.
            </p>

            <!-- Stats + CTA -->
            <div class="animate-slide-up" style="display:flex;align-items:center;gap:32px;flex-wrap:wrap">
              <div style="display:flex;gap:28px">
                <div *ngFor="let stat of stats_hero">
                  <div [style]="'font-size:24px;font-weight:900;color:' + stat.color + ';letter-spacing:-1px'">{{stat.value}}</div>
                  <div style="font-size:10px;color:#334155;margin-top:2px;letter-spacing:0.05em">{{stat.label}}</div>
                </div>
              </div>
              <button (click)="tabActiva.set('chatbot')"
                (mouseenter)="hoveredCta.set(true)" (mouseleave)="hoveredCta.set(false)"
                [style]="'background:linear-gradient(135deg,#10B981,#059669);border:none;color:white;padding:13px 24px;border-radius:14px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 8px 24px #10B98140;transition:transform 0.2s;transform:' + (hoveredCta() ? 'translateY(-2px)' : 'translateY(0)')">
                💬 Hablar con el agente →
              </button>
            </div>
          </div>

          <!-- Logo flotante -->
          <div class="animate-float" style="position:absolute;right:60px;top:50%;transform:translateY(-50%);display:none" id="hero-logo">
            <div class="animate-pulse-glow" style="width:120px;height:120px;border-radius:28px;overflow:hidden;border:2px solid #10B98125">
              <img src="myl-logo.jpeg" alt="M&L" style="width:100%;height:100%;object-fit:cover">
            </div>
          </div>
        </div>

        <!-- ══ SECCIÓN "¿TE IDENTIFICAS?" ══ -->
        <div style="position:relative;overflow:hidden;background:#080A0E">
          <div style="display:flex;align-items:stretch;min-height:200px;max-width:1200px;margin:0 auto">

            <!-- Imagen señor cansado -->
            <div style="width:280px;flex-shrink:0;position:relative;overflow:hidden">
              <img src="imagen2.jpeg" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center top;filter:brightness(0.5) saturate(0.7)">
              <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent,#080A0E)"></div>
            </div>

            <!-- Texto -->
            <div style="flex:1;padding:40px 44px;display:flex;flex-direction:column;justify-content:center">
              <div style="font-size:10px;color:#F59E0B;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">¿Te suena familiar?</div>
              <h2 style="font-size:clamp(18px,2.5vw,26px);font-weight:800;color:#F1F5F9;margin:0 0 12px;line-height:1.3;letter-spacing:-0.5px">
                ¿Cansado de los documentos<br>interminables y el estrés?
              </h2>
              <p style="font-size:13px;color:#475569;margin:0 0 20px;line-height:1.7;max-width:480px">
                Nosotros nos encargamos. En minutos tienes tu trabajo académico, análisis empresarial, tutela o estrategia de marketing lista con IA profesional.
              </p>
              <div style="display:flex;gap:16px;flex-wrap:wrap">
                <div *ngFor="let b of beneficios" style="display:flex;align-items:center;gap:6px;font-size:12px;color:#94A3B8">
                  <span [style]="'color:' + b.color + ';font-size:14px'">{{b.icon}}</span> {{b.text}}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ SERVICIOS ══ -->
        <div style="padding:44px 40px 60px;max-width:960px;margin:0 auto;width:100%;box-sizing:border-box">

          <!-- Título -->
          <div style="text-align:center;margin-bottom:32px">
            <div style="font-size:10px;color:#334155;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px">Nuestros servicios</div>
            <h2 style="font-size:clamp(20px,2.5vw,28px);font-weight:900;color:#F1F5F9;margin:0;letter-spacing:-0.8px">
              ¿Qué necesitas hoy?
            </h2>
          </div>

          <!-- Grid -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:36px">
            <div *ngFor="let s of SERVICIOS; let i = index" (click)="irAServicio(s.id)"
              (mouseenter)="hoveredServicio.set(s.id)" (mouseleave)="hoveredServicio.set('')"
              class="card-hover animate-slide-up"
              [style]="cardStyle(s)">

              <!-- Borde top animado -->
              <div [style]="'position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,' + s.color + ',' + s.color + '40);border-radius:16px 16px 0 0;opacity:' + (hoveredServicio()===s.id ? '1' : '0') + ';transition:opacity 0.3s'"></div>

              <!-- Fondo glow sutil -->
              <div [style]="'position:absolute;inset:0;background:radial-gradient(ellipse at top left,' + s.color + '08,transparent 60%);opacity:' + (hoveredServicio()===s.id ? '1' : '0') + ';transition:opacity 0.4s;pointer-events:none'"></div>

              <!-- Icono -->
              <div [style]="'position:relative;width:56px;height:56px;border-radius:16px;background:' + s.grad + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;box-shadow:0 8px 24px ' + s.shadow + ';transition:transform 0.3s;transform:' + (hoveredServicio()===s.id ? 'scale(1.12) rotate(-4deg)' : 'scale(1)')">
                <span [innerHTML]="s.svg" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px"></span>
              </div>

              <!-- Texto -->
              <div style="flex:1;min-width:0;position:relative">
                <div style="font-size:15px;font-weight:800;color:#F1F5F9;margin-bottom:5px;letter-spacing:-0.3px">{{s.label}}</div>
                <div style="font-size:11px;color:#475569;line-height:1.6;margin-bottom:10px">{{s.desc}}</div>
                <div [style]="'display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:0.05em;background:' + s.color + '12;color:' + s.color + ';border:1px solid ' + s.color + '25'">
                  ● {{s.badge}}
                </div>
              </div>

              <!-- Flecha -->
              <div [style]="'position:relative;color:' + s.color + ';font-size:26px;flex-shrink:0;transition:transform 0.25s;transform:' + (hoveredServicio()===s.id ? 'translateX(6px)' : 'translateX(0)')">›</div>
            </div>
          </div>

          <!-- Chips -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
            <div *ngFor="let c of chips; let ci = index"
              (mouseenter)="hoveredChip.set(ci)" (mouseleave)="hoveredChip.set(-1)"
              [style]="'display:flex;align-items:center;gap:7px;font-size:11px;cursor:default;background:#0A0B0E;border-radius:20px;padding:7px 16px;transition:all 0.2s;border:1px solid ' + (hoveredChip()===ci ? '#1E2530' : '#15181E') + ';color:' + (hoveredChip()===ci ? '#64748B' : '#334155')">
              <span>{{c.icon}}</span> {{c.label}}
            </div>
          </div>
        </div>

      </ng-container>

      <!-- ─── FORMULADOR ─── -->
      <ng-container *ngIf="tabActiva()==='formulador'">
        <app-formulador [iniciarConServicio]="servicioDesdeHome()"></app-formulador>
      </ng-container>

      <!-- ─── CHATBOT ─── -->
      <ng-container *ngIf="tabActiva()==='chatbot'">
        <app-chatbot style="flex:1;display:flex;flex-direction:column"></app-chatbot>
      </ng-container>

      <!-- ─── ADMIN ─── -->
      <ng-container *ngIf="tabActiva()==='admin'">
        <div style="padding:28px 32px">
          <div style="margin-bottom:24px">
            <h2 style="font-size:18px;font-weight:800;color:#F8FAFC;margin:0 0 4px">Panel de administración</h2>
            <p style="font-size:12px;color:#475569;margin:0">Estadísticas y gestión del sistema</p>
          </div>

          <!-- KPIs -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
            <div *ngFor="let kpi of kpis()" style="background:#141416;border:1px solid #1E1E24;border-radius:12px;padding:16px 18px">
              <div style="font-size:9px;color:#475569;letter-spacing:0.1em;font-weight:700;text-transform:uppercase;margin-bottom:8px">{{kpi.label}}</div>
              <div [style.color]="kpi.color" style="font-size:26px;font-weight:900">{{kpi.value}}</div>
              <div style="font-size:10px;color:#334155;margin-top:4px">{{kpi.sub}}</div>
            </div>
          </div>

          <!-- Tabs admin -->
          <div style="display:flex;gap:4px;margin-bottom:16px;background:#0E0E10;border:1px solid #1E1E24;border-radius:10px;padding:4px;width:fit-content">
            <button (click)="adminTab.set('solicitudes')" [style]="adminTab()==='solicitudes' ? adminTabActive : adminTabBase">Solicitudes</button>
            <button (click)="cargarTodosProyectos();adminTab.set('proyectos')" [style]="adminTab()==='proyectos' ? adminTabActive : adminTabBase">Proyectos</button>
            <button (click)="cargarUsuarios();adminTab.set('usuarios')" [style]="adminTab()==='usuarios' ? adminTabActive : adminTabBase">Usuarios</button>
          </div>

          <!-- Solicitudes -->
          <div *ngIf="adminTab()==='solicitudes'" style="background:#141416;border:1px solid #1E1E24;border-radius:12px;overflow:hidden">
            <div style="padding:14px 18px;border-bottom:1px solid #1E1E24;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:12px;font-weight:700;color:#F8FAFC">Últimas solicitudes</span>
              <button (click)="cargarDatos()" style="background:#1E293B;border:1px solid #334155;color:#94A3B8;border-radius:8px;padding:5px 12px;font-size:10px;cursor:pointer;font-family:inherit">↻ Actualizar</button>
            </div>
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:#0E0E10">
                  <th *ngFor="let h of ['ID','CLIENTE','ÁREA','ESTADO','SCORE','TIEMPO']"
                    style="font-size:9px;color:#475569;letter-spacing:0.1em;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid #1E1E24">{{h}}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of solicitudes()" style="border-bottom:1px solid #1A1A1E">
                  <td style="padding:10px 14px;font-family:monospace;font-size:11px;color:#10B981">{{s.id.slice(0,8)}}</td>
                  <td style="padding:10px 14px;font-size:11px;color:#E2E8F0">{{s.tipoCliente}}</td>
                  <td style="padding:10px 14px;font-size:11px;color:#94A3B8">{{s.area}}</td>
                  <td style="padding:10px 14px">
                    <span [style.color]="ESTADO_COLOR[s.estado]" style="font-size:10px;font-weight:700">● {{s.estado}}</span>
                  </td>
                  <td style="padding:10px 14px;font-size:11px;color:#A78BFA">{{s.scoreCalidad ?? '—'}}</td>
                  <td style="padding:10px 14px;font-size:11px;color:#475569">{{elapsed(s.creadoEn)}}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Proyectos -->
          <div *ngIf="adminTab()==='proyectos'" style="background:#141416;border:1px solid #1E1E24;border-radius:12px;overflow:hidden">
            <div style="padding:14px 18px;border-bottom:1px solid #1E1E24;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:12px;font-weight:700;color:#F8FAFC">Todos los proyectos
                <span style="background:#1E293B;color:#94A3B8;border-radius:20px;padding:2px 8px;font-size:10px;margin-left:8px">{{todosProyectos().length}}</span>
              </span>
              <button (click)="cargarTodosProyectos()" style="background:#1E293B;border:1px solid #334155;color:#94A3B8;border-radius:8px;padding:5px 12px;font-size:10px;cursor:pointer;font-family:inherit">↻ Actualizar</button>
            </div>
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:#0E0E10">
                  <th *ngFor="let h of ['TÍTULO','TIPO','USUARIO','ESTADO','FECHA','ACCIÓN']"
                    style="font-size:9px;color:#475569;letter-spacing:0.1em;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid #1E1E24">{{h}}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of todosProyectos()" style="border-bottom:1px solid #1A1A1E">
                  <td style="padding:10px 14px;font-size:11px;color:#E2E8F0;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    {{p.titulo || p.area || p.materia || 'Sin título'}}
                  </td>
                  <td style="padding:10px 14px;font-size:11px;color:#94A3B8">{{p.tipoServicio || '—'}}</td>
                  <td style="padding:10px 14px;font-size:11px;color:#64748B;font-family:monospace">{{p.usuarioId ? p.usuarioId.slice(0,8) : 'anónimo'}}</td>
                  <td style="padding:10px 14px">
                    <span [style.color]="ESTADO_COLOR[p.estado]" style="font-size:10px;font-weight:700">● {{p.estado}}</span>
                  </td>
                  <td style="padding:10px 14px;font-size:11px;color:#475569">{{elapsed(p.creadoEn)}}</td>
                  <td style="padding:10px 14px">
                    <button (click)="eliminarProyectoAdmin(p.id, p.titulo || p.area || 'este proyecto')"
                      style="background:#2D0A0A;border:1px solid #7F1D1D;color:#F87171;border-radius:6px;padding:4px 10px;font-size:10px;cursor:pointer;font-family:inherit">
                      🗑 Eliminar
                    </button>
                  </td>
                </tr>
                <tr *ngIf="todosProyectos().length === 0">
                  <td colspan="6" style="padding:24px;text-align:center;font-size:12px;color:#334155">No hay proyectos registrados</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Usuarios -->
          <div *ngIf="adminTab()==='usuarios'" style="background:#141416;border:1px solid #1E1E24;border-radius:12px;overflow:hidden">
            <div style="padding:14px 18px;border-bottom:1px solid #1E1E24;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:12px;font-weight:700;color:#F8FAFC">Usuarios registrados
                <span style="background:#1E293B;color:#94A3B8;border-radius:20px;padding:2px 8px;font-size:10px;margin-left:8px">{{usuarios().length}}</span>
              </span>
              <button (click)="cargarUsuarios()" style="background:#1E293B;border:1px solid #334155;color:#94A3B8;border-radius:8px;padding:5px 12px;font-size:10px;cursor:pointer;font-family:inherit">↻ Actualizar</button>
            </div>
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:#0E0E10">
                  <th *ngFor="let h of ['ID','NOMBRE','CORREO','ROL','REGISTRO','ACCIÓN']"
                    style="font-size:9px;color:#475569;letter-spacing:0.1em;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid #1E1E24">{{h}}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of usuarios()" style="border-bottom:1px solid #1A1A1E">
                  <td style="padding:10px 14px;font-family:monospace;font-size:11px;color:#10B981">{{u.id.slice(0,8)}}</td>
                  <td style="padding:10px 14px;font-size:11px;color:#E2E8F0">
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#10B981,#3B82F6);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0">
                        {{u.nombre.charAt(0).toUpperCase()}}
                      </div>
                      {{u.nombre}}
                    </div>
                  </td>
                  <td style="padding:10px 14px;font-size:11px;color:#94A3B8">{{u.email}}</td>
                  <td style="padding:10px 14px">
                    <span [style]="'font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;' + (u.rol==='admin' ? 'background:#1A0A2E;color:#A78BFA' : 'background:#0D2015;color:#10B981')">
                      {{u.rol}}
                    </span>
                  </td>
                  <td style="padding:10px 14px;font-size:11px;color:#475569">{{elapsed(u.creadoEn)}}</td>
                  <td style="padding:10px 14px">
                    <button (click)="eliminarUsuario(u.id, u.nombre)"
                      style="background:#2D0A0A;border:1px solid #7F1D1D;color:#F87171;border-radius:6px;padding:4px 10px;font-size:10px;cursor:pointer;font-family:inherit">
                      Eliminar
                    </button>
                  </td>
                </tr>
                <tr *ngIf="usuarios().length === 0">
                  <td colspan="6" style="padding:24px;text-align:center;font-size:12px;color:#334155">No hay usuarios registrados</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </ng-container>

    </div>
  </div>
  `
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();
  auth = inject(AuthService);

  tabActiva         = signal<TabPanel>('home');
  horaActual        = signal(new Date());
  servicioDesdeHome = signal<string>('');
  hoveredServicio   = signal<string>('');
  mostrarAuth       = signal(false);
  mostrarPopup      = signal(!localStorage.getItem('popup_visto'));
  hoveredWa         = signal(false);
  mostrarSubEmpresas = signal(false);
  pendienteServicio  = signal<string>('');
  hoveredSub         = signal<string>('');
  hoveredChip        = signal<number>(-1);
  hoveredCta         = signal(false);
  adminTab           = signal<'solicitudes' | 'proyectos' | 'usuarios'>('solicitudes');
  usuarios           = signal<any[]>([]);
  todosProyectos     = signal<any[]>([]);

  stats      = signal<any>({ total: 0, completadas: 0, pendientes: 0, procesando: 0, fallidas: 0, tasaExito: '—', calificacionPromedio: '—' });
  solicitudes = signal<any[]>([]);

  SERVICIOS      = SERVICIOS_HOME;
  SUB_EMPRESAS   = SUB_EMPRESAS;

  ESTADO_COLOR: any = {
    completada: '#10B981', pendiente: '#64748B', procesando: '#3B82F6', fallida: '#EF4444',
  };

  navBase      = 'background:none;border:none;color:#334155;padding:9px 10px;cursor:pointer;display:flex;align-items:center;gap:10px;border-radius:8px;font-size:12px;font-weight:600;font-family:inherit;text-align:left;width:100%;transition:color 0.15s';
  navActive    = 'background:#0D2015;border:none;border-left:2px solid #10B981;color:#10B981;padding:9px 10px;cursor:pointer;display:flex;align-items:center;gap:10px;border-radius:0 8px 8px 0;font-size:12px;font-weight:800;font-family:inherit;text-align:left;width:100%';
  adminTabBase   = 'background:none;border:none;color:#475569;padding:6px 14px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit';
  adminTabActive = 'background:#1E293B;border:none;color:#F1F5F9;padding:6px 14px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit';

  chips = [
    { icon: '📊', label: 'Análisis con IA' },
    { icon: '📄', label: 'Normas APA · ICONTEC' },
    { icon: '📈', label: 'Gráficas profesionales' },
    { icon: '⚡', label: 'Resultados en minutos' },
    { icon: '⬇️', label: 'Word y PDF' },
    { icon: '🔒', label: 'Confidencial' },
  ];

  stats_hero = [
    { value: '4',    label: 'Servicios',   color: '#10B981' },
    { value: 'IA',   label: 'Potenciado',  color: '#3B82F6' },
    { value: '24/7', label: 'Disponible',  color: '#8B5CF6' },
  ];

  beneficios = [
    { icon: '⚡', text: 'Resultados en minutos', color: '#F59E0B' },
    { icon: '📄', text: 'Normas actualizadas',   color: '#3B82F6' },
    { icon: '🔒', text: '100% confidencial',     color: '#10B981' },
    { icon: '⬇️', text: 'Word y PDF incluidos',  color: '#8B5CF6' },
  ];

  cardStyle(s: any): string {
    const hovered = this.hoveredServicio() === s.id;
    return `position:relative;background:${hovered ? '#0E1520' : '#0C0D11'};border:1px solid ${hovered ? s.color + '40' : '#1A1D24'};border-radius:16px;padding:22px 20px;cursor:pointer;display:flex;align-items:center;gap:18px;transition:all 0.25s;box-shadow:${hovered ? '0 12px 40px ' + s.shadow : '0 2px 8px rgba(0,0,0,0.3)'};overflow:hidden`;
  }

  kpis = computed(() => {
    const s = this.stats();
    return [
      { label: 'Total solicitudes',  value: s.total,                           color: '#F8FAFC', sub: 'acumuladas' },
      { label: 'Tasa de éxito',      value: s.tasaExito || '—',                color: '#10B981', sub: `${s.completadas || 0} completadas` },
      { label: 'Calificación',       value: `⭐ ${s.calificacionPromedio || '—'}`, color: '#F59E0B', sub: 'promedio' },
      { label: 'Pendientes',         value: s.pendientes || 0,                 color: '#64748B', sub: `${s.procesando || 0} procesando` },
    ];
  });

  irAMisConsultas() {
    if (!this.auth.estaAutenticado()) {
      this.pendienteServicio.set('__consultas__');
      this.mostrarAuth.set(true);
      return;
    }
    this.tabActiva.set('formulador');
  }

  irAServicio(id: string) {
    this.ejecutarServicio(id);
  }

  seleccionarSubEmpresa(id: string) {
    this.mostrarSubEmpresas.set(false);
    this.ejecutarServicio(id);
  }

  private ejecutarServicio(id: string) {
    if (id === 'analisis_empresas') {
      this.mostrarSubEmpresas.set(true);
      return;
    }
    this.servicioDesdeHome.set('');
    setTimeout(() => {
      this.servicioDesdeHome.set(id);
      this.tabActiva.set('formulador');
    }, 0);
  }

  onAuthCerrado() {
    this.mostrarAuth.set(false);
    const pendiente = this.pendienteServicio();
    this.pendienteServicio.set('');
    if (this.auth.estaAutenticado() && pendiente) {
      if (pendiente === '__consultas__') {
        this.tabActiva.set('formulador');
      } else {
        this.ejecutarServicio(pendiente);
      }
    }
  }

  ngOnInit() {
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => this.horaActual.set(new Date()));
    this.cargarDatos();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  private getAuthHeaders(): { headers: HttpHeaders } | {} {
    const token = this.auth.token();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  cargarTodosProyectos() {
    this.http.get<any>(`${environment.apiUrl}/formulador`, this.getAuthHeaders())
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe(res => { if (res?.data) this.todosProyectos.set(res.data); });
  }

  eliminarProyectoAdmin(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el proyecto "${nombre}"? Esta acción no se puede deshacer.`)) return;
    this.http.delete<any>(`${environment.apiUrl}/formulador/${id}`, this.getAuthHeaders())
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.cargarTodosProyectos());
  }

  cargarUsuarios() {
    this.http.get<any>(`${environment.apiUrl}/auth/usuarios`)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe(res => { if (res?.data) this.usuarios.set(res.data); });
  }

  eliminarUsuario(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la cuenta de ${nombre}? Esta acción no se puede deshacer.`)) return;
    this.http.delete<any>(`${environment.apiUrl}/auth/usuarios/${id}`)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.cargarUsuarios());
  }

  cargarDatos() {
    const base = environment.apiUrl;
    combineLatest([
      this.http.get<any>(`${base}/solicitudes/estadisticas`).pipe(catchError(() => of(null))),
      this.http.get<any>(`${base}/solicitudes?limite=50`).pipe(catchError(() => of(null))),
    ]).pipe(takeUntil(this.destroy$)).subscribe(([st, sol]) => {
      if (st?.data) this.stats.set(st.data);
      if (sol?.data?.data) this.solicitudes.set(sol.data.data);
    });
  }

  elapsed(iso: string) {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 1) return 'ahora'; if (d < 60) return `${d}m`;
    if (d < 1440) return `${Math.floor(d / 60)}h`; return `${Math.floor(d / 1440)}d`;
  }
}
