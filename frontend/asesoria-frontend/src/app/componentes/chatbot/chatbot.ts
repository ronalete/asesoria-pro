import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Mensaje {
  rol: 'usuario' | 'asistente';
  texto: string;
  hora: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div style="display:flex;flex-direction:column;height:100%;min-height:100vh;background:#050505;font-family:'JetBrains Mono',monospace;color:#D1D5DB">

    <!-- HEADER -->
    <div style="padding:20px 24px;border-bottom:1px solid #111;display:flex;align-items:center;gap:12px">
      <span style="font-size:20px;color:#00FF88">◈</span>
      <div>
        <div style="font-size:14px;font-weight:900;color:#FAFAF9">Asesorías Profesionales · Chat</div>
        <div style="font-size:9px;color:#374151">Asistente virtual · Asesoría de proyectos</div>
      </div>
      <button (click)="limpiar()" style="margin-left:auto;background:none;border:1px solid #1C1917;color:#374151;border-radius:6px;padding:5px 10px;font-size:10px;cursor:pointer;font-family:inherit">
        Limpiar
      </button>
    </div>

    <!-- MENSAJES -->
    <div #scrollZone style="flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:12px">

      <!-- BIENVENIDA -->
      <div *ngIf="mensajes().length === 0" style="text-align:center;padding:48px 24px">
        <div style="font-size:36px;margin-bottom:12px">◈</div>
        <div style="font-size:14px;color:#FAFAF9;font-weight:700;margin-bottom:8px">Hola, soy AsesorIA</div>
        <div style="font-size:11px;color:#4B5563;max-width:320px;margin:0 auto;line-height:1.6">
          Puedo ayudarte a formular proyectos, analizar ideas, y asesorarte en distintas áreas.
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:20px">
          <button *ngFor="let s of sugerencias" (click)="enviarSugerencia(s)"
            style="background:#080808;border:1px solid #1C1917;color:#6B7280;border-radius:8px;padding:8px 14px;font-size:11px;cursor:pointer;font-family:inherit">
            {{s}}
          </button>
        </div>
      </div>

      <!-- HISTORIAL -->
      <div *ngFor="let m of mensajes()" [style]="m.rol === 'usuario' ? 'display:flex;justify-content:flex-end' : 'display:flex;justify-content:flex-start'">
        <div [style]="burbujaStyle(m.rol)">
          <div style="white-space:pre-wrap;line-height:1.6;font-size:12px">{{m.texto}}</div>
          <div style="font-size:9px;margin-top:6px;opacity:0.4;text-align:right">{{m.hora | date:'HH:mm'}}</div>
        </div>
      </div>

      <!-- TYPING -->
      <div *ngIf="escribiendo()" style="display:flex;justify-content:flex-start">
        <div style="background:#080808;border:1px solid #111;border-radius:12px 12px 12px 2px;padding:12px 16px;max-width:120px">
          <div style="display:flex;gap:4px;align-items:center;height:16px">
            <div style="width:6px;height:6px;background:#00FF88;border-radius:50%;animation:pulse 1.2s ease-in-out infinite"></div>
            <div style="width:6px;height:6px;background:#00FF88;border-radius:50%;animation:pulse 1.2s ease-in-out infinite;animation-delay:.2s"></div>
            <div style="width:6px;height:6px;background:#00FF88;border-radius:50%;animation:pulse 1.2s ease-in-out infinite;animation-delay:.4s"></div>
          </div>
        </div>
      </div>

    </div>

    <!-- INPUT -->
    <div style="padding:16px 24px;border-top:1px solid #111">
      <div *ngIf="error()" style="font-size:10px;color:#EF4444;margin-bottom:8px">{{error()}}</div>
      <div style="display:flex;gap:8px">
        <textarea #inputMsg [(ngModel)]="mensaje" (keydown.enter)="onEnter($any($event))"
          placeholder="Escribe tu consulta..." rows="2"
          style="flex:1;background:#080808;border:1px solid #1C1917;border-radius:8px;color:#D1D5DB;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:none">
        </textarea>
        <button (click)="enviar()" [disabled]="!mensaje.trim() || escribiendo()"
          style="background:#0F1F0F;border:1px solid #00FF88;color:#00FF88;border-radius:8px;padding:10px 18px;font-size:16px;cursor:pointer;align-self:flex-end">
          ▶
        </button>
      </div>
      <div style="font-size:9px;color:#1C1917;margin-top:6px">Enter para enviar · Shift+Enter nueva línea</div>
    </div>

  </div>
  `,
  styles: [`
    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1); }
    }
  `]
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollZone') private scrollZone!: ElementRef;

  private http = inject(HttpClient);

  mensajes = signal<Mensaje[]>([]);
  mensaje = '';
  escribiendo = signal(false);
  error = signal('');
  private debeScroll = false;

  sugerencias = [
    '¿Cómo formulo un proyecto educativo?',
    'Necesito asesoría para mi emprendimiento',
    '¿Qué documentos necesito para un proyecto?',
    'Explícame el proceso de formulación',
  ];

  ngOnInit() {}

  ngAfterViewChecked() {
    if (this.debeScroll) { this.scrollBottom(); this.debeScroll = false; }
  }

  onEnter(e: KeyboardEvent) {
    if (!e.shiftKey) { e.preventDefault(); this.enviar(); }
  }

  enviarSugerencia(s: string) { this.mensaje = s; this.enviar(); }

  limpiar() { this.mensajes.set([]); this.error.set(''); }

  enviar() {
    const texto = this.mensaje.trim();
    if (!texto || this.escribiendo()) return;
    this.mensaje = '';
    this.error.set('');

    this.mensajes.update(m => [...m, { rol: 'usuario', texto, hora: new Date() }]);
    this.debeScroll = true;
    this.escribiendo.set(true);

    const historial = this.mensajes().slice(-10).map(m => ({
      role: m.rol === 'usuario' ? 'user' : 'assistant',
      content: m.texto
    }));

    this.http.post<any>(`${environment.apiUrl}/claude/chat`, { messages: historial }).subscribe({
      next: r => {
        const respuesta = r?.data?.content?.[0]?.text ?? r?.data ?? r?.message ?? 'Sin respuesta.';
        this.mensajes.update(m => [...m, { rol: 'asistente', texto: respuesta, hora: new Date() }]);
        this.escribiendo.set(false);
        this.debeScroll = true;
      },
      error: () => {
        this.error.set('No se pudo conectar con el asistente. Verifica que el backend esté activo.');
        this.escribiendo.set(false);
      }
    });
  }

  burbujaStyle(rol: 'usuario' | 'asistente') {
    const base = 'max-width:75%;padding:12px 16px;border-radius:';
    if (rol === 'usuario')
      return base + '12px 2px 12px 12px;background:#0F1F0F;border:1px solid #1A3A1A;color:#D1D5DB';
    return base + '2px 12px 12px 12px;background:#080808;border:1px solid #111;color:#D1D5DB';
  }

  private scrollBottom() {
    try { this.scrollZone.nativeElement.scrollTop = this.scrollZone.nativeElement.scrollHeight; } catch {}
  }
}
