import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Proyecto {
  id: string;
  titulo?: string;
  tipoServicio?: string;
  tipoProyecto?: string;
  area?: string;
  carrera?: string;
  semestre?: string;
  universidad?: string;
  materia?: string;
  organizacion?: string;
  sector?: string;
  faseGrado?: string;
  modalidadGrado?: string;
  estado: string;
  emailCliente?: string;
  contenidoGuia?: string;
  nombreArchivo?: string;
  documentoFormulado?: string;
  respuestas?: any;
  serviciosAdicionales?: any;
  creadoEn: string;
  actualizadoEn: string;
}

export interface SeccionDetector {
  texto: string;
  tipo: 'ia_generado' | 'plagio_potencial' | 'mixto' | 'original';
  confianza: number;
  evidencia: string;
  recomendacion: string;
}

export interface AnalisisDetector {
  id: string;
  scoreIA: number;
  scorePlagio: number;
  clasificacion: string;
  resumen: string;
  secciones: SeccionDetector[];
  recomendaciones: string[];
  creadoEn: string;
}

export interface RespuestaApi<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class FormuladorService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private base = `${environment.apiUrl}/formulador`;
  private detectorBase = `${environment.apiUrl}/detector`;

  private get headers() {
    const token = this.authService.token();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  listar(): Observable<RespuestaApi<Proyecto[]>> {
    return this.http.get<RespuestaApi<Proyecto[]>>(this.base, this.headers);
  }

  obtener(id: string): Observable<RespuestaApi<Proyecto>> {
    return this.http.get<RespuestaApi<Proyecto>>(`${this.base}/${id}`, this.headers);
  }

  crear(datos: Partial<Proyecto>): Observable<RespuestaApi<Proyecto>> {
    return this.http.post<RespuestaApi<Proyecto>>(this.base, datos, this.headers);
  }

  subirDocumento(id: string, archivo: File): Observable<RespuestaApi<any>> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<RespuestaApi<any>>(`${this.base}/${id}/subir-documento`, form);
  }

  analizar(id: string): Observable<RespuestaApi<any>> {
    return this.http.post<RespuestaApi<any>>(`${this.base}/${id}/analizar`, {});
  }

  obtenerPreguntas(id: string): Observable<RespuestaApi<any>> {
    return this.http.get<RespuestaApi<any>>(`${this.base}/${id}/preguntas`);
  }

  guardarRespuestas(id: string, respuestas: any): Observable<RespuestaApi<any>> {
    return this.http.put<RespuestaApi<any>>(`${this.base}/${id}/respuestas`, { respuestas });
  }

  guardarServicios(id: string, serviciosAdicionales: any): Observable<RespuestaApi<any>> {
    return this.http.put<RespuestaApi<any>>(`${this.base}/${id}/servicios`, { serviciosAdicionales });
  }

  formular(id: string): Observable<RespuestaApi<Proyecto>> {
    return this.http.post<RespuestaApi<Proyecto>>(`${this.base}/${id}/formular`, {});
  }

  guardarFeedback(id: string, calificacion: number, comentario?: string): Observable<RespuestaApi<any>> {
    return this.http.post<RespuestaApi<any>>(`${this.base}/${id}/feedback`, { calificacion, comentario });
  }

  eliminar(id: string): Observable<RespuestaApi<any>> {
    return this.http.delete<RespuestaApi<any>>(`${this.base}/${id}`, this.headers);
  }

  exportarWord(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/exportar/word`, { responseType: 'blob' });
  }

  exportarPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/exportar/pdf`, { responseType: 'blob' });
  }

  // Detector de Plagio / IA
  detectarTexto(texto: string): Observable<RespuestaApi<AnalisisDetector>> {
    return this.http.post<RespuestaApi<AnalisisDetector>>(`${this.detectorBase}/analizar`, { texto });
  }

  detectarArchivo(archivo: File): Observable<RespuestaApi<AnalisisDetector>> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<RespuestaApi<AnalisisDetector>>(`${this.detectorBase}/analizar-archivo`, form);
  }
}
