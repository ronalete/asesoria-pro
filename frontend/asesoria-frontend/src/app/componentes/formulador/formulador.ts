import { Component, OnInit, OnChanges, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormuladorService, Proyecto, AnalisisDetector } from '../../servicios/formulador';
import { AuthService } from '../../servicios/auth.service';
import { AuthModalComponent } from '../auth-modal/auth-modal';

type TipoServicio = 'academico' | 'personal' | 'empresarial' | 'publico' | 'grado'
  | 'detector' | 'beneficio_financiero' | 'pauta_marketing' | 'redes_sociales'
  | 'plan_trabajo' | 'formulacion_docs' | 'tutela';

type Paso = 'lista' | 'tipo' | 'contexto' | 'documento' | 'preguntas' | 'servicios'
  | 'formulacion' | 'resultado' | 'detector-input' | 'detector-resultado';

// Tipos que aparecen en la sub-selección de "Formulación de documentos"
const TIPOS_FORMULACION: { id: TipoServicio; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'academico',   icon: '🎓', label: 'Académico',         desc: 'Trabajos, ensayos, informes y proyectos de materia',   color: '#3B82F6' },
  { id: 'grado',       icon: '📋', label: 'Proyecto de Grado', desc: 'Anteproyecto, tesis, monografía, práctica empresarial', color: '#8B5CF6' },
  { id: 'empresarial', icon: '🏢', label: 'Empresarial',       desc: 'Proyectos de empresa, planes de negocio, consultoría', color: '#F59E0B' },
  { id: 'publico',     icon: '🏛️', label: 'Sector Público',    desc: 'Proyectos de entidades del estado o sector público',   color: '#10B981' },
  { id: 'personal',    icon: '💡', label: 'Personal',          desc: 'Ideas propias, proyectos personales, emprendimientos', color: '#EC4899' },
];

// Colores por tipo de servicio principal
const COLOR_SERVICIO: Record<string, string> = {
  beneficio_financiero: '#10B981', pauta_marketing: '#3B82F6',
  redes_sociales: '#8B5CF6',       plan_trabajo: '#F59E0B',
  formulacion_docs: '#06B6D4',     detector: '#F97316',
  tutela: '#E11D48',
  academico: '#3B82F6',            grado: '#8B5CF6',
  empresarial: '#F59E0B',          publico: '#10B981',  personal: '#EC4899',
};

const PASOS_PROGRESO = [
  { id: 'tipo',        label: 'Tipo' },
  { id: 'contexto',    label: 'Perfil' },
  { id: 'documento',   label: 'Documento' },
  { id: 'preguntas',   label: 'Preferencias' },
  { id: 'servicios',   label: 'Extras' },
  { id: 'formulacion', label: 'Generar' },
  { id: 'resultado',   label: 'Resultado' },
];

const INPUT_STYLE  = 'width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box';
const SELECT_STYLE = 'width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;cursor:pointer';
const LABEL_STYLE  = 'font-size:10px;color:#475569;display:block;margin-bottom:6px;letter-spacing:0.08em;font-weight:700;text-transform:uppercase';

@Component({
  selector: 'app-formulador',
  standalone: true,
  imports: [CommonModule, FormsModule, AuthModalComponent],
  template: `
  <app-auth-modal *ngIf="mostrarAuthModal()" (cerrado)="onAuthCerrado()"></app-auth-modal>
  <div style="min-height:100vh;background:#0E0E10;font-family:'Segoe UI',system-ui,sans-serif;color:#E2E8F0;padding:28px 32px">

    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">{{iconTipo(tipoSeleccionado())}}</span>
          <div>
            <h2 style="margin:0;font-size:17px;font-weight:800;color:#F8FAFC">{{labelTipo(tipoSeleccionado()) || 'Mis consultas'}}</h2>
            <div style="font-size:11px;color:#475569;margin-top:2px">M&L Profesionales · IA de Asesorías</div>
          </div>
        </div>
      </div>
      <button *ngIf="paso() !== 'lista'" (click)="volverLista()"
        style="background:#141416;border:1px solid #1E1E24;color:#64748B;border-radius:8px;padding:7px 14px;font-size:11px;cursor:pointer;font-family:inherit">
        ← Volver
      </button>
    </div>

    <!-- BARRA DE PROGRESO (solo en flujo formulador, no en detector) -->
    <div *ngIf="paso() !== 'lista' && paso() !== 'detector-input' && paso() !== 'detector-resultado'" style="display:flex;gap:6px;margin-bottom:28px;align-items:center;flex-wrap:wrap">
      <ng-container *ngFor="let p of PASOS_PROGRESO; let i = index">
        <div style="display:flex;align-items:center;gap:4px">
          <div [style]="estiloProgreso(p.id)">{{i+1}}</div>
          <span [style]="'font-size:9px;' + (paso()===p.id ? 'color:#00FF88;font-weight:700' : pasoCompletado(p.id) ? 'color:#374151' : 'color:#1C1917')">{{p.label}}</span>
        </div>
        <span *ngIf="i < PASOS_PROGRESO.length-1" style="color:#1C1917;font-size:10px">›</span>
      </ng-container>
    </div>

    <!-- ═══ LISTA ═══ -->
    <ng-container *ngIf="paso() === 'lista'">
      <div *ngIf="cargando()" style="text-align:center;padding:48px;color:#374151">Cargando...</div>
      <div *ngIf="!cargando() && proyectos().length === 0"
        style="text-align:center;padding:48px;color:#374151;background:#080808;border:1px solid #111;border-radius:12px">
        <div style="font-size:32px;margin-bottom:12px">📄</div>
        <div style="font-size:13px;color:#FAFAF9">No hay documentos aún</div>
        <button (click)="paso.set('tipo')"
          style="margin-top:16px;background:#0F1F0F;border:1px solid #00FF88;color:#00FF88;border-radius:8px;padding:9px 24px;font-size:12px;cursor:pointer;font-family:inherit">
          + Crear mi primer documento
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div *ngFor="let p of proyectos()"
          style="background:#080808;border:1px solid #111;border-radius:12px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:12px;cursor:pointer;flex:1" (click)="abrirProyecto(p)">
            <span style="font-size:20px">{{iconTipo(p.tipoServicio)}}</span>
            <div>
              <div style="font-size:13px;color:#FAFAF9;font-weight:700">
                {{p.titulo || p.materia || p.area || 'Documento ' + p.id.slice(0,8)}}
              </div>
              <div style="font-size:10px;color:#4B5563;margin-top:3px">
                {{labelTipo(p.tipoServicio)}}
                <span *ngIf="p.carrera"> · {{p.carrera}}</span>
                <span *ngIf="p.organizacion"> · {{p.organizacion}}</span>
                · {{p.creadoEn | date:'dd/MM/yyyy'}}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span [style.color]="colorEstado(p.estado)" style="font-size:11px;font-weight:700">● {{p.estado}}</span>
            <button (click)="$event.stopPropagation(); confirmarEliminar(p)"
              style="background:#1A0505;border:1px solid #3F0F0F;color:#F87171;border-radius:8px;padding:5px 10px;font-size:10px;cursor:pointer;font-family:inherit;flex-shrink:0"
              title="Eliminar proyecto">
              🗑
            </button>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- ═══ PASO 1: TIPO (solo para Formulación de documentos) ═══ -->
    <ng-container *ngIf="paso() === 'tipo'">
      <div style="max-width:680px">
        <div style="font-size:14px;color:#F8FAFC;font-weight:800;margin-bottom:6px">📄 Formulación de documentos</div>
        <div style="font-size:11px;color:#64748B;margin-bottom:20px">Selecciona el tipo de documento que necesitas generar</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div *ngFor="let t of TIPOS_FORMULACION" (click)="seleccionarTipo(t.id)"
            [style]="'background:#141416;border:' + (tipoSeleccionado()===t.id ? '2px solid '+t.color : '1px solid #1E1E24') + ';border-radius:12px;padding:18px;cursor:pointer'">
            <div style="font-size:24px;margin-bottom:8px">{{t.icon}}</div>
            <div [style]="'font-size:13px;font-weight:700;margin-bottom:4px;color:'+t.color">{{t.label}}</div>
            <div style="font-size:10px;color:#475569;line-height:1.5">{{t.desc}}</div>
          </div>
        </div>
        <button (click)="irContexto()" [disabled]="!tipoSeleccionado()"
          style="margin-top:20px;width:100%;background:#0F2D1F;border:1px solid #10B981;color:#10B981;border-radius:10px;padding:11px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:700"
          [style.opacity]="tipoSeleccionado() ? '1' : '0.4'">
          Continuar →
        </button>
      </div>
    </ng-container>

    <!-- ═══ DETECTOR: INPUT ═══ -->
    <ng-container *ngIf="paso() === 'detector-input'">
      <div style="max-width:720px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="font-size:22px">🔍</span>
          <div style="font-size:14px;color:#FAFAF9;font-weight:700">Detector de Plagio / IA</div>
        </div>
        <div style="font-size:11px;color:#4B5563;margin-bottom:20px">
          Pega tu texto o sube un documento PDF/TXT. El sistema identificará secciones generadas por IA o con posible plagio y te dará recomendaciones concretas.
        </div>

        <!-- Tabs: texto / archivo -->
        <div style="display:flex;gap:4px;margin-bottom:16px">
          <button (click)="detectorModo.set('texto')"
            [style]="'padding:7px 16px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit;border:1px solid ' + (detectorModo()==='texto' ? '#F97316' : '#1C1917') + ';background:' + (detectorModo()==='texto' ? '#1A0A00' : '#080808') + ';color:' + (detectorModo()==='texto' ? '#F97316' : '#6B7280')">
            ✏️ Pegar texto
          </button>
          <button (click)="detectorModo.set('archivo')"
            [style]="'padding:7px 16px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit;border:1px solid ' + (detectorModo()==='archivo' ? '#F97316' : '#1C1917') + ';background:' + (detectorModo()==='archivo' ? '#1A0A00' : '#080808') + ';color:' + (detectorModo()==='archivo' ? '#F97316' : '#6B7280')">
            📎 Subir archivo
          </button>
        </div>

        <!-- Modo texto -->
        <ng-container *ngIf="detectorModo() === 'texto'">
          <div style="font-size:10px;color:#374151;margin-bottom:6px;letter-spacing:0.08em;font-weight:700">TEXTO A ANALIZAR <span style="color:#EF4444">*</span> <span style="color:#4B5563;font-weight:400">(mínimo 50 caracteres)</span></div>
          <textarea [(ngModel)]="detectorTexto" rows="14" placeholder="Pega aquí el texto de tu documento, ensayo, tesis o cualquier texto que quieras analizar..."
            style="width:100%;background:#080808;border:1px solid #1C1917;border-radius:8px;color:#D1D5DB;padding:12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;line-height:1.7">
          </textarea>
          <div style="font-size:10px;color:#4B5563;margin-top:4px;text-align:right">{{detectorTexto.length}} caracteres</div>
        </ng-container>

        <!-- Modo archivo -->
        <ng-container *ngIf="detectorModo() === 'archivo'">
          <div style="background:#080808;border:2px dashed #1C1917;border-radius:14px;padding:32px;text-align:center"
            (dragover)="$event.preventDefault()" (drop)="onDropDetector($event)">
            <input type="file" #fileDetector (change)="onFileDetector($event)" accept=".pdf,.txt" style="display:none"/>
            <div *ngIf="!detectorArchivo()">
              <div style="font-size:32px;margin-bottom:10px">📄</div>
              <div style="font-size:12px;color:#FAFAF9;margin-bottom:6px">Arrastra tu archivo aquí</div>
              <div style="font-size:10px;color:#4B5563;margin-bottom:14px">PDF o TXT · Máx. 10 MB</div>
              <button (click)="fileDetector.click()"
                style="background:#111;border:1px solid #374151;color:#9CA3AF;border-radius:8px;padding:8px 20px;font-size:11px;cursor:pointer;font-family:inherit">
                Seleccionar archivo
              </button>
            </div>
            <div *ngIf="detectorArchivo()" style="display:flex;align-items:center;gap:12px;justify-content:center">
              <span style="font-size:24px">📎</span>
              <div style="text-align:left">
                <div style="font-size:12px;color:#F97316;font-weight:700">{{detectorArchivo()!.name}}</div>
                <div style="font-size:10px;color:#6B7280">{{(detectorArchivo()!.size / 1024).toFixed(1)}} KB</div>
              </div>
              <button (click)="detectorArchivo.set(null)" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:16px">✕</button>
            </div>
          </div>
        </ng-container>

        <div *ngIf="error()" style="background:#1A0A0A;border:1px solid #EF4444;border-radius:8px;padding:12px;font-size:11px;color:#EF4444;margin:12px 0">{{error()}}</div>

        <button (click)="ejecutarDeteccion()" [disabled]="procesando() || !detectorInputValido()"
          style="margin-top:16px;width:100%;background:#1A0500;border:1px solid #F97316;color:#F97316;border-radius:8px;padding:12px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:700"
          [style.opacity]="detectorInputValido() && !procesando() ? '1' : '0.4'">
          {{procesando() ? '⟳ Analizando con IA...' : '🔍 Analizar documento'}}
        </button>
        <div *ngIf="procesando()" style="font-size:10px;color:#374151;text-align:center;margin-top:8px">Este proceso puede tomar 20-40 segundos</div>
      </div>
    </ng-container>

    <!-- ═══ DETECTOR: RESULTADO ═══ -->
    <ng-container *ngIf="paso() === 'detector-resultado'">
      <div style="max-width:800px" *ngIf="analisisDetector()">

        <!-- Scores principales -->
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
          <div [style]="'flex:1;min-width:160px;background:#080808;border:1px solid ' + colorScoreIA() + ';border-radius:12px;padding:20px;text-align:center'">
            <div style="font-size:10px;color:#6B7280;margin-bottom:6px;letter-spacing:0.08em;font-weight:700">CONTENIDO IA</div>
            <div [style]="'font-size:36px;font-weight:900;' + 'color:' + colorScoreIA()">{{analisisDetector()!.scoreIA | number:'1.0-0'}}%</div>
            <div style="font-size:10px;color:#4B5563;margin-top:4px">probabilidad generado por IA</div>
          </div>
          <div [style]="'flex:1;min-width:160px;background:#080808;border:1px solid ' + colorScorePlagio() + ';border-radius:12px;padding:20px;text-align:center'">
            <div style="font-size:10px;color:#6B7280;margin-bottom:6px;letter-spacing:0.08em;font-weight:700">PLAGIO POTENCIAL</div>
            <div [style]="'font-size:36px;font-weight:900;color:' + colorScorePlagio()">{{analisisDetector()!.scorePlagio | number:'1.0-0'}}%</div>
            <div style="font-size:10px;color:#4B5563;margin-top:4px">similitud con texto genérico</div>
          </div>
          <div [style]="'flex:1;min-width:160px;background:#080808;border:1px solid ' + colorClasificacion() + ';border-radius:12px;padding:20px;text-align:center'">
            <div style="font-size:10px;color:#6B7280;margin-bottom:6px;letter-spacing:0.08em;font-weight:700">CLASIFICACIÓN</div>
            <div [style]="'font-size:22px;font-weight:900;color:' + colorClasificacion()">{{analisisDetector()!.clasificacion | uppercase}}</div>
            <div style="font-size:10px;color:#4B5563;margin-top:4px">nivel de riesgo global</div>
          </div>
        </div>

        <!-- Diagnóstico general -->
        <div style="background:#080808;border:1px solid #1C1917;border-radius:12px;padding:16px 20px;margin-bottom:20px">
          <div style="font-size:10px;color:#374151;margin-bottom:8px;letter-spacing:0.08em;font-weight:700">DIAGNÓSTICO GENERAL</div>
          <div style="font-size:12px;color:#D1D5DB;line-height:1.8">{{analisisDetector()!.resumen}}</div>
        </div>

        <!-- Secciones analizadas -->
        <div style="font-size:10px;color:#374151;margin-bottom:12px;letter-spacing:0.08em;font-weight:700">ANÁLISIS POR SECCIONES</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
          <div *ngFor="let s of analisisDetector()!.secciones"
            [style]="'background:#080808;border:1px solid ' + colorTipoSeccion(s.tipo) + '33;border-left:3px solid ' + colorTipoSeccion(s.tipo) + ';border-radius:8px;padding:14px 16px'">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span [style]="'font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:' + colorTipoSeccion(s.tipo) + '22;color:' + colorTipoSeccion(s.tipo)">
                {{labelTipoSeccion(s.tipo)}} · {{s.confianza}}% confianza
              </span>
            </div>
            <!-- Texto resaltado -->
            <div style="background:#050505;border-radius:6px;padding:10px;margin-bottom:10px;font-size:11px;color:#D1D5DB;line-height:1.7;font-style:italic;border-left:2px solid #374151">
              "{{s.texto}}"
            </div>
            <div style="margin-bottom:6px">
              <span style="font-size:10px;color:#6B7280;font-weight:700">EVIDENCIA: </span>
              <span style="font-size:11px;color:#9CA3AF">{{s.evidencia}}</span>
            </div>
            <div style="background:#0A1A0A;border-radius:6px;padding:8px 10px">
              <span style="font-size:10px;color:#10B981;font-weight:700">💡 RECOMENDACIÓN: </span>
              <span style="font-size:11px;color:#A7F3D0">{{s.recomendacion}}</span>
            </div>
          </div>
        </div>

        <!-- Recomendaciones generales -->
        <div style="background:#080808;border:1px solid #1C1917;border-radius:12px;padding:16px 20px;margin-bottom:20px">
          <div style="font-size:10px;color:#374151;margin-bottom:12px;letter-spacing:0.08em;font-weight:700">RECOMENDACIONES GENERALES</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div *ngFor="let r of analisisDetector()!.recomendaciones; let i = index"
              style="display:flex;gap:10px;align-items:flex-start">
              <span style="font-size:10px;color:#F97316;font-weight:900;min-width:18px">{{i+1}}.</span>
              <span style="font-size:12px;color:#D1D5DB;line-height:1.7">{{r}}</span>
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button (click)="nuevoAnalisis()"
            style="flex:1;min-width:160px;background:#1A0500;border:1px solid #F97316;color:#F97316;border-radius:8px;padding:10px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:700">
            🔍 Nuevo análisis
          </button>
          <button (click)="volverLista()"
            style="background:none;border:1px solid #1C1917;color:#374151;border-radius:8px;padding:10px 16px;font-size:11px;cursor:pointer;font-family:inherit">
            ← Documentos
          </button>
        </div>
      </div>
    </ng-container>

    <!-- ═══ PASO 2: CONTEXTO ═══ -->
    <ng-container *ngIf="paso() === 'contexto'">
      <div style="max-width:540px">
        <div style="font-size:14px;color:#FAFAF9;font-weight:700;margin-bottom:4px">{{iconTipo(tipoSeleccionado())}} Cuéntanos tu perfil</div>
        <div style="font-size:11px;color:#4B5563;margin-bottom:20px">Esta información permite personalizar el documento exactamente a tu contexto</div>

        <!-- ACADÉMICO -->
        <ng-container *ngIf="tipoSeleccionado() === 'academico'">
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">CARRERA <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxAcad.carrera" placeholder="Ej: Ingeniería de Sistemas" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">SEMESTRE <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxAcad.semestre" placeholder="Ej: 5" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">UNIVERSIDAD <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxAcad.universidad" placeholder="Ej: Universidad Nacional de Colombia" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">MATERIA <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxAcad.materia" placeholder="Ej: Gestión de Proyectos" [style]="INPUT_STYLE"/></div>
        </ng-container>

        <!-- PROYECTO DE GRADO -->
        <ng-container *ngIf="tipoSeleccionado() === 'grado'">
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">CARRERA <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxGrado.carrera" placeholder="Ej: Administración de Empresas" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">UNIVERSIDAD <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxGrado.universidad" placeholder="Ej: Universidad de los Andes" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px">
            <label [style]="LABEL_STYLE">MODALIDAD <span style="color:#EF4444">*</span></label>
            <select [(ngModel)]="ctxGrado.modalidad" [style]="SELECT_STYLE">
              <option value="">Selecciona la modalidad</option>
              <option>Trabajo de grado</option>
              <option>Tesis</option>
              <option>Monografía</option>
              <option>Práctica empresarial</option>
              <option>Proyecto de investigación</option>
              <option>Emprendimiento</option>
            </select>
          </div>
          <div style="margin-bottom:14px">
            <label [style]="LABEL_STYLE">FASE ACTUAL <span style="color:#EF4444">*</span></label>
            <select [(ngModel)]="ctxGrado.fase" [style]="SELECT_STYLE">
              <option value="">Selecciona la fase</option>
              <option>Idea inicial</option>
              <option>Anteproyecto</option>
              <option>Desarrollo del documento</option>
              <option>Corrección y revisión</option>
            </select>
          </div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">TEMA O TÍTULO TENTATIVO</label>
            <input [(ngModel)]="ctxGrado.titulo" placeholder="Ej: Impacto de la digitalización en PYMEs colombianas" [style]="INPUT_STYLE"/></div>
        </ng-container>

        <!-- EMPRESARIAL / PÚBLICO -->
        <ng-container *ngIf="tipoSeleccionado() === 'empresarial' || tipoSeleccionado() === 'publico'">
          <div style="margin-bottom:14px">
            <label [style]="LABEL_STYLE">{{tipoSeleccionado() === 'publico' ? 'ENTIDAD' : 'EMPRESA / ORGANIZACIÓN'}} <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxOrg.organizacion" [placeholder]="tipoSeleccionado() === 'publico' ? 'Ej: Alcaldía de Medellín' : 'Ej: TechCorp S.A.S'" [style]="INPUT_STYLE"/>
          </div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">SECTOR <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxOrg.sector" [placeholder]="tipoSeleccionado() === 'publico' ? 'Ej: Educación, Salud' : 'Ej: Tecnología, Retail'" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">NOMBRE DEL PROYECTO</label>
            <input [(ngModel)]="ctxOrg.titulo" placeholder="Ej: Plan de transformación digital" [style]="INPUT_STYLE"/></div>
        </ng-container>

        <!-- PERSONAL -->
        <ng-container *ngIf="tipoSeleccionado() === 'personal'">
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">NOMBRE DEL PROYECTO <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxPersonal.titulo" placeholder="Ej: App de delivery para mascotas" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">DESCRIPCIÓN BREVE</label>
            <textarea [(ngModel)]="ctxPersonal.descripcion" placeholder="¿De qué trata? ¿Qué problema resuelve?" rows="3"
              style="width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box"></textarea>
          </div>
        </ng-container>

        <!-- BENEFICIO FINANCIERO -->
        <ng-container *ngIf="tipoSeleccionado() === 'beneficio_financiero'">
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">EMPRESA / NEGOCIO / NOMBRE <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxFinanciero.empresa" placeholder="Ej: Panadería Don Carlos, Freelancer Ronald M." [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">SECTOR O INDUSTRIA <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxFinanciero.sector" placeholder="Ej: Alimentos, Tecnología, Educación" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">SITUACIÓN FINANCIERA ACTUAL <span style="color:#EF4444">*</span></label>
            <textarea [(ngModel)]="ctxFinanciero.situacion" placeholder="Describe brevemente tus ingresos actuales, costos principales o situación financiera..." rows="3"
              style="width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box"></textarea></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">PRINCIPAL DESAFÍO O META FINANCIERA <span style="color:#EF4444">*</span></label>
            <textarea [(ngModel)]="ctxFinanciero.desafio" placeholder="¿Qué quieres lograr? Ej: aumentar ingresos, reducir costos, buscar financiación..." rows="2"
              style="width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box"></textarea></div>
        </ng-container>

        <!-- PLAN DE PAUTA / MARKETING -->
        <ng-container *ngIf="tipoSeleccionado() === 'pauta_marketing'">
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">EMPRESA / NEGOCIO / MARCA <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxMarketing.empresa" placeholder="Ej: Boutique Valentina, Clínica Dr. Pérez" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">PRODUCTO O SERVICIO A PAUTAR <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxMarketing.producto" placeholder="Ej: Curso online de cocina, servicio de diseño gráfico" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">PRESUPUESTO MENSUAL APROXIMADO <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxMarketing.presupuesto" placeholder="Ej: $200.000 COP, $500.000 COP, sin presupuesto definido" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">OBJETIVO DE LA PAUTA <span style="color:#EF4444">*</span></label>
            <textarea [(ngModel)]="ctxMarketing.objetivo" placeholder="¿Qué quieres lograr? Ej: conseguir 50 clientes nuevos, aumentar ventas un 30%, posicionar la marca" rows="2"
              style="width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box"></textarea></div>
        </ng-container>

        <!-- IMPACTO EN REDES SOCIALES -->
        <ng-container *ngIf="tipoSeleccionado() === 'redes_sociales'">
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">MARCA / EMPRESA / NOMBRE PERSONAL <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxRedes.marca" placeholder="Ej: @TiendaModaLuisa, Empresa XYZ" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">REDES SOCIALES ACTUALES <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxRedes.redes" placeholder="Ej: Instagram 1.2k, TikTok 300, ninguna aún" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">AUDIENCIA OBJETIVO <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxRedes.audiencia" placeholder="Ej: mujeres 25-40 años, Colombia, interesadas en moda" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">OBJETIVO EN REDES <span style="color:#EF4444">*</span></label>
            <textarea [(ngModel)]="ctxRedes.objetivo" placeholder="¿Qué quieres lograr? Ej: llegar a 10k seguidores, vender por DM, generar comunidad" rows="2"
              style="width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box"></textarea></div>
        </ng-container>

        <!-- PLAN DE TRABAJO -->
        <ng-container *ngIf="tipoSeleccionado() === 'plan_trabajo'">
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">NOMBRE DEL PROYECTO <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxPlanTrabajo.proyecto" placeholder="Ej: Lanzamiento nuevo producto, Migración de sistema" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">DESCRIPCIÓN Y OBJETIVO PRINCIPAL <span style="color:#EF4444">*</span></label>
            <textarea [(ngModel)]="ctxPlanTrabajo.descripcion" placeholder="¿En qué consiste el proyecto y qué quieres lograr?" rows="3"
              style="width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box"></textarea></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">TAMAÑO DEL EQUIPO</label>
            <input [(ngModel)]="ctxPlanTrabajo.equipo" placeholder="Ej: 1 persona, equipo de 5, sin equipo definido" [style]="INPUT_STYLE"/></div>
          <div style="margin-bottom:14px"><label [style]="LABEL_STYLE">PLAZO ESTIMADO <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxPlanTrabajo.plazo" placeholder="Ej: 1 mes, 3 meses, sin fecha definida" [style]="INPUT_STYLE"/></div>
        </ng-container>

        <!-- TUTELA -->
        <ng-container *ngIf="tipoSeleccionado() === 'tutela'">
          <!-- Banner informativo -->
          <div style="background:#1A0010;border:1px solid #E11D4840;border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;gap:10px;align-items:flex-start">
            <span style="font-size:18px;flex-shrink:0">⚖️</span>
            <div style="font-size:11px;color:#FDA4AF;line-height:1.6">
              <strong style="color:#F43F5E">Acción de Tutela — Derecho colombiano.</strong> Completa la información con el mayor detalle posible. Entre más datos proporciones, más sólida y específica será la tutela generada.
            </div>
          </div>

          <!-- Tipo de tutela -->
          <div style="margin-bottom:14px">
            <label [style]="LABEL_STYLE">TIPO DE TUTELA <span style="color:#EF4444">*</span></label>
            <select [(ngModel)]="ctxTutela.tipo" [style]="SELECT_STYLE">
              <option value="">— Selecciona el tipo —</option>
              <option>Salud (EPS / IPS)</option>
              <option>Derecho de petición</option>
              <option>Laboral / pensiones</option>
              <option>Mínimo vital</option>
              <option>Educación</option>
              <option>Vivienda digna</option>
              <option>Debido proceso</option>
              <option>Comercial / contractual</option>
              <option>Otro</option>
            </select>
          </div>

          <!-- Derecho vulnerado -->
          <div style="margin-bottom:14px">
            <label [style]="LABEL_STYLE">DERECHO FUNDAMENTAL VULNERADO <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxTutela.derechoVulnerado" placeholder="Ej: Derecho a la salud (Art. 49 CP), Derecho de petición (Art. 23 CP)" [style]="INPUT_STYLE"/>
          </div>

          <!-- Accionado -->
          <div style="margin-bottom:14px">
            <label [style]="LABEL_STYLE">ENTIDAD O PERSONA ACCIONADA <span style="color:#EF4444">*</span></label>
            <input [(ngModel)]="ctxTutela.accionado" placeholder="Ej: EPS Sanitas, Alcaldía de Medellín, Empresa XYZ SAS" [style]="INPUT_STYLE"/>
          </div>

          <!-- Hechos -->
          <div style="margin-bottom:14px">
            <label [style]="LABEL_STYLE">HECHOS (orden cronológico) <span style="color:#EF4444">*</span></label>
            <textarea [(ngModel)]="ctxTutela.hechos" rows="5"
              placeholder="Describe los hechos en orden. Ejemplo:&#10;1. El día 10/01/2025 solicité autorización de cirugía a la EPS...&#10;2. La EPS negó la solicitud sin justificación...&#10;3. El médico tratante emitió urgencia médica el 15/01/2025..."
              style="width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;line-height:1.7"></textarea>
          </div>

          <!-- Solicitudes previas -->
          <div style="margin-bottom:14px">
            <label [style]="LABEL_STYLE">SOLICITUDES PREVIAS REALIZADAS</label>
            <textarea [(ngModel)]="ctxTutela.solicitudesPrevias" rows="2"
              placeholder="Ej: Derecho de petición enviado el 01/02/2025, sin respuesta. Queja ante la Superintendencia el 05/02/2025..."
              style="width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box"></textarea>
          </div>

          <!-- Pretensiones -->
          <div style="margin-bottom:14px">
            <label [style]="LABEL_STYLE">PRETENSIONES (qué solicita al juez) <span style="color:#EF4444">*</span></label>
            <textarea [(ngModel)]="ctxTutela.pretensiones" rows="3"
              placeholder="Ej: Ordenar a la EPS autorizar la cirugía de rodilla en un plazo no mayor a 48 horas. Ordenar indemnización por daño moral..."
              style="width:100%;background:#141416;border:1px solid #1E1E24;border-radius:8px;color:#E2E8F0;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box"></textarea>
          </div>

          <!-- Datos del accionante -->
          <div style="background:#141416;border:1px solid #1E1E24;border-radius:10px;padding:14px 16px;margin-bottom:14px">
            <div style="font-size:10px;color:#475569;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px">DATOS DEL ACCIONANTE</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div><label [style]="LABEL_STYLE">NOMBRE COMPLETO <span style="color:#EF4444">*</span></label>
                <input [(ngModel)]="ctxTutela.nombre" placeholder="Ej: María Fernanda Torres" [style]="INPUT_STYLE"/></div>
              <div><label [style]="LABEL_STYLE">CÉDULA DE CIUDADANÍA <span style="color:#EF4444">*</span></label>
                <input [(ngModel)]="ctxTutela.cedula" placeholder="Ej: 1.023.456.789" [style]="INPUT_STYLE"/></div>
              <div><label [style]="LABEL_STYLE">CIUDAD DE PRESENTACIÓN</label>
                <input [(ngModel)]="ctxTutela.ciudad" placeholder="Ej: Medellín, Bogotá" [style]="INPUT_STYLE"/></div>
              <div><label [style]="LABEL_STYLE">TELÉFONO / CORREO</label>
                <input [(ngModel)]="ctxTutela.contacto" placeholder="Ej: 3001234567 / correo@email.com" [style]="INPUT_STYLE"/></div>
            </div>
          </div>
        </ng-container>

        <div *ngIf="error()" style="background:#1A0A0A;border:1px solid #EF4444;border-radius:8px;padding:12px;font-size:11px;color:#EF4444;margin-bottom:12px">{{error()}}</div>
        <button (click)="irDocumento()" [disabled]="procesando() || !contextoValido()"
          style="width:100%;background:#0F1F0F;border:1px solid #00FF88;color:#00FF88;border-radius:8px;padding:11px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:700"
          [style.opacity]="contextoValido() ? '1' : '0.4'">
          {{procesando() ? '⟳ Guardando...' : 'Continuar →'}}
        </button>
      </div>
    </ng-container>

    <!-- ═══ PASO 3: DOCUMENTO ═══ -->
    <ng-container *ngIf="paso() === 'documento'">
      <div style="max-width:540px">
        <div style="font-size:14px;color:#FAFAF9;font-weight:700;margin-bottom:4px">Sube el documento guía</div>
        <div style="font-size:11px;color:#4B5563;margin-bottom:20px">
          <span *ngIf="tipoSeleccionado() === 'academico'">Sube la guía o enunciado de la materia "{{ctxAcad.materia}}" para que podamos entender exactamente lo que pide.</span>
          <span *ngIf="tipoSeleccionado() === 'grado'">Sube las pautas o guía de tu universidad si las tienes. Si no tienes, continúa sin documento.</span>
          <span *ngIf="tipoSeleccionado() !== 'academico' && tipoSeleccionado() !== 'grado'">Sube cualquier documento de referencia (brief, términos, etc.). Opcional.</span>
        </div>
        <div style="background:#080808;border:2px dashed #1C1917;border-radius:14px;padding:32px;text-align:center;margin-bottom:16px"
          (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <input type="file" #fileInput (change)="onFileChange($event)" accept=".pdf,.txt" style="display:none"/>
          <div *ngIf="!archivoSeleccionado()">
            <div style="font-size:32px;margin-bottom:10px">📄</div>
            <div style="font-size:12px;color:#FAFAF9;margin-bottom:6px">Arrastra tu archivo aquí</div>
            <div style="font-size:10px;color:#4B5563;margin-bottom:14px">PDF o TXT · Máx. 10 MB</div>
            <button (click)="fileInput.click()"
              style="background:#111;border:1px solid #374151;color:#9CA3AF;border-radius:8px;padding:8px 20px;font-size:11px;cursor:pointer;font-family:inherit">
              Seleccionar archivo
            </button>
          </div>
          <div *ngIf="archivoSeleccionado()" style="display:flex;align-items:center;gap:12px;justify-content:center">
            <span style="font-size:24px">📎</span>
            <div style="text-align:left">
              <div style="font-size:12px;color:#00FF88;font-weight:700">{{archivoSeleccionado()!.name}}</div>
              <div style="font-size:10px;color:#6B7280">{{(archivoSeleccionado()!.size / 1024).toFixed(1)}} KB</div>
            </div>
            <button (click)="archivoSeleccionado.set(null)" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:16px">✕</button>
          </div>
        </div>
        <div *ngIf="error()" style="background:#1A0A0A;border:1px solid #EF4444;border-radius:8px;padding:12px;font-size:11px;color:#EF4444;margin-bottom:12px">{{error()}}</div>
        <div style="display:flex;gap:8px">
          <button (click)="procesarDocumentoYAnalizar()" [disabled]="procesando() || !archivoSeleccionado()"
            style="flex:1;background:#0F1F0F;border:1px solid #00FF88;color:#00FF88;border-radius:8px;padding:11px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:700"
            [style.opacity]="archivoSeleccionado() && !procesando() ? '1' : '0.4'">
            {{procesando() ? '⟳ ' + mensajeProcesando() : '▶ Procesar documento'}}
          </button>
          <button (click)="analizarSinDocumento()" [disabled]="procesando()"
            style="background:none;border:1px solid #374151;color:#6B7280;border-radius:8px;padding:11px 14px;font-size:11px;cursor:pointer;font-family:inherit">
            Sin documento →
          </button>
        </div>
      </div>
    </ng-container>

    <!-- ═══ PASO 4: PREGUNTAS / PREFERENCIAS ═══ -->
    <ng-container *ngIf="paso() === 'preguntas'">
      <div style="max-width:680px">
        <div style="font-size:14px;color:#FAFAF9;font-weight:700;margin-bottom:4px">Tus preferencias para el documento</div>
        <div style="font-size:11px;color:#4B5563;margin-bottom:20px">
          Responde estas preguntas para que el documento quede exactamente como lo necesitas.
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px">
          <div *ngFor="let p of preguntas(); let i = index"
            style="background:#080808;border:1px solid #111;border-radius:12px;padding:16px 20px">
            <div style="font-size:10px;color:#6B7280;margin-bottom:4px;font-weight:700">PREGUNTA {{i+1}} DE {{preguntas().length}}</div>
            <div style="font-size:12px;color:#FAFAF9;margin-bottom:8px;line-height:1.6;font-weight:700">{{p.pregunta}}</div>
            <div *ngIf="p.ayuda" style="font-size:10px;color:#4B5563;margin-bottom:10px;font-style:italic">💡 {{p.ayuda}}</div>
            <!-- CERRADA: dropdown -->
            <select *ngIf="p.tipo === 'cerrada' && p.opciones?.length" [(ngModel)]="respuestas[i]" [style]="SELECT_STYLE">
              <option value="">— Selecciona una opción —</option>
              <option *ngFor="let op of p.opciones" [value]="op">{{op}}</option>
            </select>
            <!-- ABIERTA: textarea -->
            <textarea *ngIf="p.tipo !== 'cerrada' || !p.opciones?.length" [(ngModel)]="respuestas[i]"
              placeholder="Tu respuesta..." rows="3"
              style="width:100%;background:#050505;border:1px solid #1C1917;border-radius:8px;color:#D1D5DB;padding:10px 12px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box">
            </textarea>
          </div>
        </div>
        <div *ngIf="error()" style="background:#1A0A0A;border:1px solid #EF4444;border-radius:8px;padding:12px;font-size:11px;color:#EF4444;margin-bottom:12px">{{error()}}</div>
        <button (click)="enviarRespuestas()" [disabled]="procesando()"
          style="width:100%;background:#0F1F0F;border:1px solid #00FF88;color:#00FF88;border-radius:8px;padding:11px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:700">
          {{procesando() ? '⟳ Guardando...' : 'Continuar →'}}
        </button>
      </div>
    </ng-container>

    <!-- ═══ PASO 5: SERVICIOS ADICIONALES ═══ -->
    <ng-container *ngIf="paso() === 'servicios'">
      <div style="max-width:560px">
        <div style="font-size:14px;color:#FAFAF9;font-weight:700;margin-bottom:4px">¿Necesitas algo adicional?</div>
        <div style="font-size:11px;color:#4B5563;margin-bottom:20px">
          Selecciona los entregables adicionales que quieres junto con el documento principal.
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
          <div *ngFor="let s of SERVICIOS_EXTRAS" (click)="toggleServicio(s.id)"
            [style]="'background:#080808;border:' + (serviciosSeleccionados[s.id] ? '1px solid '+s.color+';background:#0A0A0A' : '1px solid #1C1917') + ';border-radius:12px;padding:16px 20px;cursor:pointer;display:flex;align-items:center;gap:14px'">
            <div [style]="'width:20px;height:20px;border-radius:4px;border:2px solid ' + (serviciosSeleccionados[s.id] ? s.color : '#374151') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0'">
              <span *ngIf="serviciosSeleccionados[s.id]" [style]="'font-size:12px;color:'+s.color">✓</span>
            </div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#FAFAF9">{{s.icon}} {{s.label}}</div>
              <div style="font-size:10px;color:#6B7280;margin-top:2px">{{s.desc}}</div>
            </div>
          </div>
        </div>
        <div *ngIf="error()" style="background:#1A0A0A;border:1px solid #EF4444;border-radius:8px;padding:12px;font-size:11px;color:#EF4444;margin-bottom:12px">{{error()}}</div>
        <div style="display:flex;gap:8px">
          <button (click)="guardarServiciosYContinuar()" [disabled]="procesando()"
            style="flex:1;background:#0F1F0F;border:1px solid #00FF88;color:#00FF88;border-radius:8px;padding:11px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:700">
            {{procesando() ? '⟳ Guardando...' : 'Continuar →'}}
          </button>
        </div>
      </div>
    </ng-container>

    <!-- ═══ PASO 6: FORMULACIÓN ═══ -->
    <ng-container *ngIf="paso() === 'formulacion'">
      <div style="max-width:560px">
        <div style="font-size:14px;color:#FAFAF9;font-weight:700;margin-bottom:4px">Generar documento</div>
        <div style="font-size:11px;color:#4B5563;margin-bottom:20px">
          Asesorías Profesionales generará el documento completo con toda la información recopilada.
        </div>
        <div style="background:#080808;border:1px solid #111;border-radius:12px;padding:20px;margin-bottom:16px">
          <div style="font-size:10px;color:#374151;margin-bottom:12px;letter-spacing:0.08em;font-weight:700">RESUMEN DE TU SOLICITUD</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;gap:8px"><span style="font-size:10px;color:#6B7280;min-width:90px">Tipo</span><span style="font-size:11px;color:#FAFAF9">{{labelTipo(proyectoActual()?.tipoServicio)}}</span></div>
            <div *ngIf="proyectoActual()?.carrera" style="display:flex;gap:8px"><span style="font-size:10px;color:#6B7280;min-width:90px">Carrera</span><span style="font-size:11px;color:#FAFAF9">{{proyectoActual()?.carrera}}</span></div>
            <div *ngIf="proyectoActual()?.materia" style="display:flex;gap:8px"><span style="font-size:10px;color:#6B7280;min-width:90px">Materia</span><span style="font-size:11px;color:#FAFAF9">{{proyectoActual()?.materia}}</span></div>
            <div *ngIf="proyectoActual()?.modalidadGrado" style="display:flex;gap:8px"><span style="font-size:10px;color:#6B7280;min-width:90px">Modalidad</span><span style="font-size:11px;color:#A78BFA">{{proyectoActual()?.modalidadGrado}}</span></div>
            <div *ngIf="proyectoActual()?.faseGrado" style="display:flex;gap:8px"><span style="font-size:10px;color:#6B7280;min-width:90px">Fase</span><span style="font-size:11px;color:#F59E0B">{{proyectoActual()?.faseGrado}}</span></div>
            <div *ngIf="proyectoActual()?.area" style="display:flex;gap:8px"><span style="font-size:10px;color:#6B7280;min-width:90px">Área</span><span style="font-size:11px;color:#00FF88">{{proyectoActual()?.area}}</span></div>
            <div *ngIf="proyectoActual()?.nombreArchivo" style="display:flex;gap:8px"><span style="font-size:10px;color:#6B7280;min-width:90px">Documento</span><span style="font-size:11px;color:#FAFAF9">📎 {{proyectoActual()?.nombreArchivo}}</span></div>
            <div *ngIf="serviciosTexto()" style="display:flex;gap:8px"><span style="font-size:10px;color:#6B7280;min-width:90px">Extras</span><span style="font-size:11px;color:#10B981">{{serviciosTexto()}}</span></div>
          </div>
        </div>
        <div *ngIf="error()" style="background:#1A0A0A;border:1px solid #EF4444;border-radius:8px;padding:12px;font-size:11px;color:#EF4444;margin-bottom:12px">{{error()}}</div>
        <!-- Bloque de login requerido -->
        <div *ngIf="!auth.estaAutenticado()" style="background:#1A1208;border:1px solid #78350F;border-radius:12px;padding:16px 20px;margin-bottom:12px;display:flex;align-items:center;gap:14px">
          <span style="font-size:24px;flex-shrink:0">🔒</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:#FCD34D;margin-bottom:3px">Inicia sesión para generar tu documento</div>
            <div style="font-size:11px;color:#92400E;line-height:1.5">Tu progreso está guardado. Crea una cuenta gratis o inicia sesión para continuar.</div>
          </div>
          <button (click)="mostrarAuthModal.set(true)" style="background:linear-gradient(135deg,#10B981,#059669);border:none;color:white;border-radius:10px;padding:10px 18px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0">
            Iniciar sesión →
          </button>
        </div>

        <button (click)="ejecutarFormulacion()" [disabled]="procesando() || !auth.estaAutenticado()"
          [style]="'width:100%;border-radius:8px;padding:12px;font-size:13px;cursor:' + (auth.estaAutenticado() ? 'pointer' : 'not-allowed') + ';font-family:inherit;font-weight:700;background:' + (auth.estaAutenticado() ? '#0F1F0F' : '#111') + ';border:1px solid ' + (auth.estaAutenticado() ? '#00FF88' : '#1E1E24') + ';color:' + (auth.estaAutenticado() ? '#00FF88' : '#334155')">
          {{procesando() ? '⟳ Asesorías Profesionales está generando tu documento...' : '▶ Generar Documento'}}
        </button>
        <div *ngIf="procesando()" style="font-size:10px;color:#374151;text-align:center;margin-top:8px">
          Este proceso puede tomar entre 30 y 60 segundos
        </div>
      </div>
    </ng-container>

    <!-- ═══ PASO 7: RESULTADO ═══ -->
    <ng-container *ngIf="paso() === 'resultado'">
      <div style="max-width:760px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <span style="font-size:28px">✅</span>
          <div>
            <div style="font-size:15px;color:#FAFAF9;font-weight:700">Documento generado exitosamente</div>
            <div style="font-size:10px;color:#10B981">{{proyectoActual()?.materia || proyectoActual()?.modalidadGrado || proyectoActual()?.area || 'Completado'}} · Asesorías Profesionales</div>
          </div>
        </div>
        <div style="background:#080808;border:1px solid #111;border-radius:12px;padding:24px;margin-bottom:16px;max-height:500px;overflow-y:auto">
          <pre style="font-size:11px;color:#D1D5DB;line-height:1.8;white-space:pre-wrap;font-family:'JetBrains Mono',monospace;margin:0">{{proyectoActual()?.documentoFormulado || 'Sin contenido.'}}</pre>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
          <button (click)="exportar('word')"
            style="flex:1;min-width:160px;background:#080808;border:1px solid #3B82F6;color:#3B82F6;border-radius:8px;padding:10px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:700">
            ↓ Descargar Word (.docx)
          </button>
          <button (click)="exportar('pdf')"
            style="flex:1;min-width:160px;background:#080808;border:1px solid #EF4444;color:#EF4444;border-radius:8px;padding:10px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:700">
            ↓ Descargar PDF
          </button>
          <button (click)="volverLista()"
            style="background:none;border:1px solid #1C1917;color:#374151;border-radius:8px;padding:10px 16px;font-size:11px;cursor:pointer;font-family:inherit">
            Ver documentos
          </button>
        </div>

        <!-- Feedback / Autoaprendizaje -->
        <div style="background:#080808;border:1px solid #1C1917;border-radius:12px;padding:16px 20px">
          <div style="font-size:10px;color:#374151;margin-bottom:12px;letter-spacing:0.08em;font-weight:700">¿QUÉ TAL EL DOCUMENTO? · Tu feedback mejora los próximos</div>
          <div *ngIf="!feedbackEnviado()">
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <button *ngFor="let n of [1,2,3,4,5]" (click)="feedbackCalificacion.set(n)"
                [style]="'width:38px;height:38px;border-radius:8px;font-size:16px;cursor:pointer;border:1px solid ' + (feedbackCalificacion()===n ? '#F59E0B' : '#1C1917') + ';background:' + (feedbackCalificacion()===n ? '#1A1000' : '#080808')">
                {{['😞','😕','😐','😊','🤩'][n-1]}}
              </button>
              <span *ngIf="feedbackCalificacion()" style="font-size:11px;color:#F59E0B;align-self:center;margin-left:8px">{{['Muy malo','Malo','Regular','Bueno','Excelente'][feedbackCalificacion()!-1]}}</span>
            </div>
            <textarea [(ngModel)]="feedbackComentario" placeholder="¿Qué mejorarías? (opcional)" rows="2"
              style="width:100%;background:#050505;border:1px solid #1C1917;border-radius:8px;color:#D1D5DB;padding:9px 12px;font-size:11px;font-family:inherit;outline:none;resize:none;box-sizing:border-box;margin-bottom:10px">
            </textarea>
            <button (click)="enviarFeedback()" [disabled]="!feedbackCalificacion() || enviandoFeedback()"
              style="background:#0F1F0F;border:1px solid #00FF88;color:#00FF88;border-radius:8px;padding:8px 20px;font-size:11px;cursor:pointer;font-family:inherit;font-weight:700"
              [style.opacity]="feedbackCalificacion() ? '1' : '0.4'">
              {{enviandoFeedback() ? '⟳ Enviando...' : 'Enviar feedback'}}
            </button>
          </div>
          <div *ngIf="feedbackEnviado()" style="font-size:12px;color:#10B981">
            ✅ ¡Gracias! Tu feedback ayuda a que los próximos documentos sean mejores.
          </div>
        </div>
      </div>
    </ng-container>

  </div>
  `
})
export class FormuladorComponent implements OnInit, OnChanges {
  private svc = inject(FormuladorService);
  auth = inject(AuthService);
  mostrarAuthModal = signal(false);

  @Input() iniciarConServicio = '';

  TIPOS_FORMULACION = TIPOS_FORMULACION;
  PASOS_PROGRESO = PASOS_PROGRESO;
  INPUT_STYLE  = INPUT_STYLE;
  SELECT_STYLE = SELECT_STYLE;
  LABEL_STYLE  = LABEL_STYLE;

  SERVICIOS_EXTRAS = [
    { id: 'guion',         icon: '🎤', label: 'Guion de sustentación',      desc: 'Texto estructurado para defender el documento oralmente',    color: '#3B82F6' },
    { id: 'diapositivas',  icon: '📊', label: 'Presentación (PowerPoint)',   desc: 'Estructura y contenido para diapositivas de sustentación',   color: '#F59E0B' },
    { id: 'resumen',       icon: '📝', label: 'Resumen ejecutivo',           desc: 'Síntesis de máximo 1 página del documento completo',         color: '#10B981' },
    { id: 'abstract',      icon: '🌐', label: 'Abstract en inglés',          desc: 'Resumen del proyecto en inglés para publicación académica',   color: '#8B5CF6' },
  ];

  paso               = signal<Paso>('lista');
  tipoSeleccionado   = signal<TipoServicio | null>(null);
  proyectos          = signal<Proyecto[]>([]);
  proyectoActual     = signal<Proyecto | null>(null);
  preguntas          = signal<any[]>([]);
  respuestas: string[] = [];
  archivoSeleccionado = signal<File | null>(null);
  cargando           = signal(false);
  procesando         = signal(false);
  error              = signal('');
  mensajeProcesando  = signal('Procesando...');
  serviciosSeleccionados: Record<string, boolean> = {};

  // Detector de Plagio / IA
  detectorModo       = signal<'texto' | 'archivo'>('texto');
  detectorTexto      = '';
  detectorArchivo    = signal<File | null>(null);
  analisisDetector   = signal<AnalisisDetector | null>(null);

  // Feedback / Autoaprendizaje
  feedbackCalificacion = signal<number | null>(null);
  feedbackComentario   = '';
  feedbackEnviado      = signal(false);
  enviandoFeedback     = signal(false);

  ctxAcad     = { carrera: '', semestre: '', universidad: '', materia: '' };
  ctxGrado    = { carrera: '', universidad: '', modalidad: '', fase: '', titulo: '' };
  ctxOrg      = { organizacion: '', sector: '', titulo: '' };
  ctxPersonal = { titulo: '', descripcion: '' };
  // Nuevos servicios
  ctxFinanciero  = { empresa: '', sector: '', desafio: '', situacion: '' };
  ctxMarketing   = { empresa: '', producto: '', presupuesto: '', objetivo: '' };
  ctxRedes       = { marca: '', redes: '', audiencia: '', objetivo: '' };
  ctxPlanTrabajo = { proyecto: '', descripcion: '', equipo: '', plazo: '' };
  ctxTutela      = { tipo: '', derechoVulnerado: '', accionado: '', hechos: '', solicitudesPrevias: '', pretensiones: '', ciudad: '', nombre: '', cedula: '', contacto: '' };

  ngOnInit()    { this.cargarProyectos(); }

  ngOnChanges() {
    if (this.iniciarConServicio) {
      this.aplicarServicioInicial(this.iniciarConServicio);
    }
  }

  aplicarServicioInicial(servicio: string) {
    this.error.set(''); this.procesando.set(false);
    if (servicio === 'formulacion_docs') {
      this.tipoSeleccionado.set(null); this.paso.set('tipo');
    } else if (servicio === 'detector') {
      this.tipoSeleccionado.set('detector'); this.paso.set('detector-input');
    } else {
      this.tipoSeleccionado.set(servicio as TipoServicio); this.paso.set('contexto');
    }
  }

  cargarProyectos() {
    this.cargando.set(true);
    this.svc.listar().subscribe({
      next: r => { if (r.success) this.proyectos.set(r.data); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  seleccionarTipo(t: TipoServicio) { this.tipoSeleccionado.set(t); }

  irContexto() {
    this.error.set('');
    if (this.tipoSeleccionado() === 'detector') {
      this.paso.set('detector-input');
    } else {
      this.paso.set('contexto');
    }
  }

  contextoValido(): boolean {
    const t = this.tipoSeleccionado();
    if (t === 'academico')            return !!(this.ctxAcad.carrera && this.ctxAcad.semestre && this.ctxAcad.universidad && this.ctxAcad.materia);
    if (t === 'grado')                return !!(this.ctxGrado.carrera && this.ctxGrado.universidad && this.ctxGrado.modalidad && this.ctxGrado.fase);
    if (t === 'empresarial' || t === 'publico') return !!(this.ctxOrg.organizacion && this.ctxOrg.sector);
    if (t === 'personal')             return !!this.ctxPersonal.titulo;
    if (t === 'beneficio_financiero') return !!(this.ctxFinanciero.empresa && this.ctxFinanciero.sector && this.ctxFinanciero.desafio);
    if (t === 'pauta_marketing')      return !!(this.ctxMarketing.empresa && this.ctxMarketing.producto && this.ctxMarketing.objetivo);
    if (t === 'redes_sociales')       return !!(this.ctxRedes.marca && this.ctxRedes.redes && this.ctxRedes.objetivo);
    if (t === 'plan_trabajo')         return !!(this.ctxPlanTrabajo.proyecto && this.ctxPlanTrabajo.descripcion && this.ctxPlanTrabajo.plazo);
    if (t === 'tutela')               return !!(this.ctxTutela.derechoVulnerado && this.ctxTutela.accionado && this.ctxTutela.hechos && this.ctxTutela.pretensiones && this.ctxTutela.nombre && this.ctxTutela.cedula);
    return false;
  }

  irDocumento() {
    if (!this.contextoValido()) return;
    this.procesando.set(true);
    this.error.set('');
    const t = this.tipoSeleccionado()!;
    const datos: Partial<Proyecto> = { tipoServicio: t };

    if (t === 'academico') {
      datos.carrera = this.ctxAcad.carrera; datos.semestre = this.ctxAcad.semestre;
      datos.universidad = this.ctxAcad.universidad; datos.materia = this.ctxAcad.materia;
      datos.titulo = `${this.ctxAcad.materia} — ${this.ctxAcad.carrera}`;
    } else if (t === 'grado') {
      datos.carrera = this.ctxGrado.carrera; datos.universidad = this.ctxGrado.universidad;
      datos.modalidadGrado = this.ctxGrado.modalidad; datos.faseGrado = this.ctxGrado.fase;
      datos.titulo = this.ctxGrado.titulo || `${this.ctxGrado.modalidad} — ${this.ctxGrado.carrera}`;
    } else if (t === 'empresarial' || t === 'publico') {
      datos.organizacion = this.ctxOrg.organizacion; datos.sector = this.ctxOrg.sector;
      datos.titulo = this.ctxOrg.titulo || this.ctxOrg.organizacion;
    } else if (t === 'beneficio_financiero') {
      datos.organizacion = this.ctxFinanciero.empresa; datos.sector = this.ctxFinanciero.sector;
      datos.titulo = `Beneficio Financiero — ${this.ctxFinanciero.empresa}`;
      datos.area = this.ctxFinanciero.desafio; datos.materia = this.ctxFinanciero.situacion;
    } else if (t === 'pauta_marketing') {
      datos.organizacion = this.ctxMarketing.empresa; datos.sector = this.ctxMarketing.producto;
      datos.titulo = `Plan de Pauta — ${this.ctxMarketing.empresa}`;
      datos.area = this.ctxMarketing.objetivo; datos.materia = this.ctxMarketing.presupuesto;
    } else if (t === 'redes_sociales') {
      datos.organizacion = this.ctxRedes.marca; datos.sector = this.ctxRedes.redes;
      datos.titulo = `Redes Sociales — ${this.ctxRedes.marca}`;
      datos.area = this.ctxRedes.objetivo; datos.materia = this.ctxRedes.audiencia;
    } else if (t === 'plan_trabajo') {
      datos.titulo = this.ctxPlanTrabajo.proyecto; datos.sector = this.ctxPlanTrabajo.equipo;
      datos.area = this.ctxPlanTrabajo.descripcion; datos.materia = this.ctxPlanTrabajo.plazo;
    } else if (t === 'tutela') {
      datos.titulo    = `Tutela — ${this.ctxTutela.tipo || this.ctxTutela.derechoVulnerado}`;
      datos.organizacion = this.ctxTutela.accionado;
      datos.sector    = this.ctxTutela.tipo;
      datos.area      = this.ctxTutela.derechoVulnerado;
      datos.emailCliente = this.ctxTutela.contacto;
      // Enviamos toda la información como contenido guía para el prompt
      datos.contenidoGuia = `INFORMACIÓN COMPLETA DE LA TUTELA:

ACCIONANTE: ${this.ctxTutela.nombre} — CC: ${this.ctxTutela.cedula}
CIUDAD: ${this.ctxTutela.ciudad || 'No especificada'}
CONTACTO: ${this.ctxTutela.contacto || 'No especificado'}

HECHOS:
${this.ctxTutela.hechos}

SOLICITUDES PREVIAS:
${this.ctxTutela.solicitudesPrevias || 'Ninguna registrada'}

PRETENSIONES DEL ACCIONANTE:
${this.ctxTutela.pretensiones}`;
    } else {
      datos.titulo = this.ctxPersonal.titulo;
    }

    this.svc.crear(datos).subscribe({
      next: r => {
        if (r.success) {
          this.proyectoActual.set(r.data);
          this.proyectos.update(p => [r.data, ...p]);
          // Tutela: saltar documento y preguntas, ir directo a formulación
          if (t === 'tutela') {
            this.svc.analizar(r.data.id).subscribe({
              next: () => { this.paso.set('formulacion'); this.procesando.set(false); },
              error: () => { this.paso.set('formulacion'); this.procesando.set(false); },
            });
          } else {
            this.paso.set('documento');
            this.procesando.set(false);
          }
        } else {
          this.procesando.set(false);
        }
      },
      error: (e) => { this.error.set(e?.error?.message || 'Error al crear.'); this.procesando.set(false); },
    });
  }

  onFileChange(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) this.archivoSeleccionado.set(f); }
  onDrop(e: DragEvent)   { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) this.archivoSeleccionado.set(f); }

  procesarDocumentoYAnalizar() {
    const id = this.proyectoActual()?.id; const archivo = this.archivoSeleccionado();
    if (!id || !archivo) return;
    this.procesando.set(true); this.error.set('');
    this.mensajeProcesando.set('Extrayendo texto del documento...');
    this.svc.subirDocumento(id, archivo).subscribe({
      next: () => {
        this.mensajeProcesando.set('Analizando el documento...');
        this.svc.analizar(id).subscribe({
          next: () => { this.mensajeProcesando.set('Preparando preguntas...'); this.cargarPreguntas(id); },
          error: (e) => { this.error.set(e?.error?.message || 'Error al analizar.'); this.procesando.set(false); },
        });
      },
      error: (e) => { this.error.set(e?.error?.message || 'Error al subir el archivo.'); this.procesando.set(false); },
    });
  }

  analizarSinDocumento() {
    const id = this.proyectoActual()?.id; if (!id) return;
    this.procesando.set(true); this.error.set('');
    this.mensajeProcesando.set('Preparando preguntas...');
    this.svc.analizar(id).subscribe({
      next: () => this.cargarPreguntas(id),
      error: (e) => { this.error.set(e?.error?.message || 'Error.'); this.procesando.set(false); },
    });
  }

  private cargarPreguntas(id: string) {
    this.svc.obtenerPreguntas(id).subscribe({
      next: r => {
        const lista = Array.isArray(r.data) ? r.data : (r.data?.preguntas ?? []);
        this.preguntas.set(lista);
        this.respuestas = new Array(lista.length).fill('');
        this.paso.set('preguntas');
        this.procesando.set(false);
      },
      error: (e) => { this.error.set(e?.error?.message || 'Error al obtener preguntas.'); this.procesando.set(false); },
    });
  }

  enviarRespuestas() {
    const id = this.proyectoActual()?.id; if (!id) return;
    this.procesando.set(true); this.error.set('');
    const payload = this.preguntas().map((p, i) => ({ pregunta: p.pregunta, respuesta: this.respuestas[i] || '' }));
    this.svc.guardarRespuestas(id, payload).subscribe({
      next: () => { this.paso.set('servicios'); this.procesando.set(false); },
      error: () => { this.error.set('Error al guardar.'); this.procesando.set(false); },
    });
  }

  toggleServicio(id: string) { this.serviciosSeleccionados[id] = !this.serviciosSeleccionados[id]; }

  guardarServiciosYContinuar() {
    const id = this.proyectoActual()?.id; if (!id) return;
    this.procesando.set(true); this.error.set('');
    this.svc.guardarServicios(id, this.serviciosSeleccionados).subscribe({
      next: () => { this.paso.set('formulacion'); this.procesando.set(false); },
      error: () => { this.error.set('Error al guardar servicios.'); this.procesando.set(false); },
    });
  }

  onAuthCerrado() {
    this.mostrarAuthModal.set(false);
    // Si ya se autenticó, ejecutar la formulación automáticamente
    if (this.auth.estaAutenticado()) {
      this.ejecutarFormulacion();
    }
  }

  ejecutarFormulacion() {
    const id = this.proyectoActual()?.id; if (!id) return;
    this.procesando.set(true); this.error.set('');
    this.svc.formular(id).subscribe({
      next: r => { if (r.success) { this.proyectoActual.set(r.data); this.proyectos.update(ps => ps.map(p => p.id === r.data.id ? r.data : p)); this.paso.set('resultado'); } this.procesando.set(false); },
      error: (e) => { this.error.set(e?.error?.message || 'Error al generar.'); this.procesando.set(false); },
    });
  }

  exportar(tipo: 'word' | 'pdf') {
    const id = this.proyectoActual()?.id; if (!id) return;
    const obs = tipo === 'word' ? this.svc.exportarWord(id) : this.svc.exportarPdf(id);
    obs.subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `documento_${id.slice(0,8)}.${tipo === 'word' ? 'docx' : 'pdf'}`;
      a.click(); URL.revokeObjectURL(url);
    });
  }

  abrirProyecto(p: Proyecto) {
    this.proyectoActual.set(p); this.tipoSeleccionado.set(p.tipoServicio as TipoServicio);
    this.error.set('');
    if (p.estado === 'completado') { this.paso.set('resultado'); return; }
    this.paso.set('formulacion');
  }

  confirmarEliminar(p: Proyecto) {
    const nombre = p.titulo || p.materia || p.area || 'este proyecto';
    if (!confirm(`¿Eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`)) return;
    this.svc.eliminar(p.id).subscribe({
      next: () => this.cargarProyectos(),
      error: (err) => alert(err?.error?.message || 'Error al eliminar el proyecto'),
    });
  }

  serviciosTexto(): string {
    return this.SERVICIOS_EXTRAS.filter(s => this.serviciosSeleccionados[s.id]).map(s => s.label).join(', ');
  }

  volverLista() {
    this.paso.set('lista'); this.proyectoActual.set(null); this.tipoSeleccionado.set(null);
    this.archivoSeleccionado.set(null); this.error.set(''); this.preguntas.set([]); this.respuestas = [];
    this.serviciosSeleccionados = {};
    this.ctxAcad = { carrera: '', semestre: '', universidad: '', materia: '' };
    this.ctxGrado = { carrera: '', universidad: '', modalidad: '', fase: '', titulo: '' };
    this.ctxOrg = { organizacion: '', sector: '', titulo: '' };
    this.ctxPersonal = { titulo: '', descripcion: '' };
    // Resetear detector, feedback y tutela
    this.analisisDetector.set(null); this.detectorTexto = ''; this.detectorArchivo.set(null);
    this.feedbackCalificacion.set(null); this.feedbackComentario = ''; this.feedbackEnviado.set(false);
    this.ctxTutela = { tipo: '', derechoVulnerado: '', accionado: '', hechos: '', solicitudesPrevias: '', pretensiones: '', ciudad: '', nombre: '', cedula: '', contacto: '' };
    this.cargarProyectos();
  }

  // ── Detector de Plagio / IA ───────────��──────────────────────────────────

  onFileDetector(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) this.detectorArchivo.set(f); }
  onDropDetector(e: DragEvent) { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) this.detectorArchivo.set(f); }

  detectorInputValido(): boolean {
    if (this.detectorModo() === 'texto') return this.detectorTexto.trim().length >= 50;
    return !!this.detectorArchivo();
  }

  ejecutarDeteccion() {
    this.procesando.set(true); this.error.set('');
    const obs = this.detectorModo() === 'texto'
      ? this.svc.detectarTexto(this.detectorTexto)
      : this.svc.detectarArchivo(this.detectorArchivo()!);
    obs.subscribe({
      next: r => {
        if (r.success) { this.analisisDetector.set(r.data); this.paso.set('detector-resultado'); }
        this.procesando.set(false);
      },
      error: (e) => { this.error.set(e?.error?.message || 'Error al analizar el documento.'); this.procesando.set(false); },
    });
  }

  nuevoAnalisis() {
    this.analisisDetector.set(null); this.detectorTexto = ''; this.detectorArchivo.set(null); this.error.set('');
    this.paso.set('detector-input');
  }

  colorScoreIA(): string {
    const s = this.analisisDetector()?.scoreIA || 0;
    if (s >= 70) return '#EF4444'; if (s >= 40) return '#F59E0B'; return '#10B981';
  }
  colorScorePlagio(): string {
    const s = this.analisisDetector()?.scorePlagio || 0;
    if (s >= 70) return '#EF4444'; if (s >= 40) return '#F59E0B'; return '#10B981';
  }
  colorClasificacion(): string {
    const c = this.analisisDetector()?.clasificacion || 'bajo';
    const m: Record<string, string> = { bajo: '#10B981', medio: '#F59E0B', alto: '#F97316', muy_alto: '#EF4444' };
    return m[c] || '#6B7280';
  }
  colorTipoSeccion(tipo: string): string {
    const m: Record<string, string> = { ia_generado: '#EF4444', plagio_potencial: '#F59E0B', mixto: '#F97316', original: '#10B981' };
    return m[tipo] || '#6B7280';
  }
  labelTipoSeccion(tipo: string): string {
    const m: Record<string, string> = { ia_generado: '🤖 Generado por IA', plagio_potencial: '⚠️ Plagio potencial', mixto: '🔶 Mixto', original: '✅ Original' };
    return m[tipo] || tipo;
  }

  // ── Feedback / Autoaprendizaje ────────────────────────────���──────────────

  enviarFeedback() {
    const id = this.proyectoActual()?.id; if (!id || !this.feedbackCalificacion()) return;
    this.enviandoFeedback.set(true);
    this.svc.guardarFeedback(id, this.feedbackCalificacion()!, this.feedbackComentario || undefined).subscribe({
      next: () => { this.feedbackEnviado.set(true); this.enviandoFeedback.set(false); },
      error: () => { this.enviandoFeedback.set(false); },
    });
  }

  estiloProgreso(id: string): string {
    const activo = this.paso() === id; const comp = this.pasoCompletado(id);
    const base = 'width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;';
    if (activo)  return base + 'background:#00FF88;color:#050505;';
    if (comp)    return base + 'background:#1C1917;color:#374151;';
    return base + 'background:#080808;border:1px solid #1C1917;color:#1C1917;';
  }

  pasoCompletado(id: string): boolean {
    const orden = ['tipo','contexto','documento','preguntas','servicios','formulacion','resultado'];
    return orden.indexOf(id) < orden.indexOf(this.paso());
  }

  iconTipo(t?: string | null): string {
    const m: Record<string, string> = {
      academico:'🎓', grado:'📋', personal:'💡', empresarial:'🏢', publico:'🏛️',
      detector:'🔍', beneficio_financiero:'💰', pauta_marketing:'📣',
      redes_sociales:'📱', plan_trabajo:'📋', formulacion_docs:'📄', tutela:'⚖️',
    };
    return m[t!] || '📄';
  }

  labelTipo(t?: string | null): string {
    const m: Record<string, string> = {
      academico:'Académico', grado:'Proyecto de Grado', personal:'Personal',
      empresarial:'Empresarial', publico:'Sector Público', detector:'Detector Plagio / IA',
      beneficio_financiero:'Beneficio Financiero', pauta_marketing:'Plan de Pauta',
      redes_sociales:'Redes Sociales', plan_trabajo:'Plan de Trabajo', formulacion_docs:'Formulación de Docs', tutela:'Acción de Tutela',
    };
    return m[t!] || 'Consulta';
  }

  colorServicio(t?: string | null): string {
    return COLOR_SERVICIO[t!] || '#10B981';
  }

  colorEstado(estado: string): string {
    const m: Record<string, string> = { completado:'#10B981', pendiente:'#6B7280', analizado:'#3B82F6', error:'#EF4444' };
    return m[estado] || '#6B7280';
  }
}
