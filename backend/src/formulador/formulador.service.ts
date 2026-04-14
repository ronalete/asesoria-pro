// Servicio principal del agente formulador con integración Claude API
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proyecto } from './entities/proyecto.entity';
import { FeedbackDocumento } from './entities/feedback-documento.entity';
import { ClaudeService, ContextoProyecto } from '../claude/claude.service';

@Injectable()
export class FormuladorService {
  constructor(
    @InjectRepository(Proyecto)
    private proyectoRepository: Repository<Proyecto>,
    @InjectRepository(FeedbackDocumento)
    private feedbackRepository: Repository<FeedbackDocumento>,
    private claudeService: ClaudeService,
  ) {}

  private limpiarJSON(texto: string): string {
    return texto.replace(/```json|```/g, '').trim();
  }

  private construirContexto(proyecto: Proyecto): ContextoProyecto {
    return {
      tipoServicio: proyecto.tipoServicio,
      tipoProyecto: proyecto.tipoProyecto,
      area: proyecto.area,
      carrera: proyecto.carrera,
      semestre: proyecto.semestre,
      universidad: proyecto.universidad,
      materia: proyecto.materia,
      organizacion: proyecto.organizacion,
      sector: proyecto.sector,
    };
  }

  async crearProyecto(datos: Partial<Proyecto>): Promise<Proyecto> {
    const proyecto = this.proyectoRepository.create({ ...datos, estado: 'pendiente' });
    return await this.proyectoRepository.save(proyecto);
  }

  async eliminarProyecto(id: string, usuarioId: string): Promise<void> {
    const proyecto = await this.proyectoRepository.findOne({ where: { id } });
    if (!proyecto) throw new Error('Proyecto no encontrado');
    if (proyecto.usuarioId && proyecto.usuarioId !== usuarioId) {
      throw new Error('No tienes permiso para eliminar este proyecto');
    }
    await this.proyectoRepository.delete(id);
  }

  async obtenerTodos(usuarioId?: string): Promise<Proyecto[]> {
    const where = usuarioId ? { usuarioId } : {};
    return await this.proyectoRepository.find({ where, order: { creadoEn: 'DESC' } });
  }

  async obtenerPorId(id: string): Promise<Proyecto | null> {
    return await this.proyectoRepository.findOne({ where: { id } });
  }

  async guardarDocumento(id: string, contenido: string, nombreArchivo: string): Promise<Proyecto | null> {
    await this.proyectoRepository.update(id, { contenidoGuia: contenido, nombreArchivo });
    return await this.obtenerPorId(id);
  }

  async analizarDocumento(id: string, contenidoExterno?: string): Promise<Proyecto | null> {
    const proyecto = await this.obtenerPorId(id);
    if (!proyecto) throw new Error('Proyecto no encontrado');

    const textoAAnalizar = contenidoExterno
      || proyecto.contenidoGuia
      || proyecto.titulo
      || 'Proyecto sin descripción';

    const contexto = this.construirContexto(proyecto);
    const resultadoRaw = await this.claudeService.analizarDocumento(textoAAnalizar, contexto);

    let resultado: { tipoProyecto: string; area: string; descripcionBreve?: string };
    try {
      resultado = JSON.parse(this.limpiarJSON(resultadoRaw));
    } catch {
      throw new Error(`Respuesta inválida del análisis: ${resultadoRaw}`);
    }

    const actualizacion: Partial<Proyecto> = {
      tipoProyecto: resultado.tipoProyecto,
      area: resultado.area,
      estado: 'analizado',
    };
    if (contenidoExterno) actualizacion.contenidoGuia = contenidoExterno;

    await this.proyectoRepository.update(id, actualizacion);
    return await this.obtenerPorId(id);
  }

  async generarPreguntas(id: string): Promise<object> {
    const proyecto = await this.obtenerPorId(id);
    if (!proyecto) throw new Error('Proyecto no encontrado');
    if (!proyecto.tipoServicio) {
      await this.proyectoRepository.update(id, { tipoServicio: 'academico' });
      proyecto.tipoServicio = 'academico';
    }

    const contexto = this.construirContexto(proyecto);
    const resumenDocumento = proyecto.contenidoGuia
      ? proyecto.contenidoGuia.substring(0, 500)
      : undefined;

    const preguntasRaw = await this.claudeService.generarPreguntas(contexto, resumenDocumento);
    try {
      return JSON.parse(this.limpiarJSON(preguntasRaw));
    } catch {
      throw new Error(`Respuesta inválida en preguntas: ${preguntasRaw}`);
    }
  }

  // Formular proyecto completo — usa feedback previo como aprendizaje (few-shot)
  async formularProyecto(id: string): Promise<Proyecto | null> {
    const proyecto = await this.obtenerPorId(id);
    if (!proyecto) throw new Error('Proyecto no encontrado');

    // Obtener ejemplos exitosos del mismo tipo/área para autoaprendizaje
    const ejemplosExitosos = await this.feedbackRepository.find({
      where: {
        tipoServicio: proyecto.tipoServicio,
      },
      order: { calificacion: 'DESC', creadoEn: 'DESC' },
      take: 3,
    });

    const contexto = this.construirContexto(proyecto);
    const documentoFormulado = await this.claudeService.formularProyecto(
      contexto,
      proyecto.contenidoGuia || '',
      proyecto.respuestas || {},
      proyecto.serviciosAdicionales,
      ejemplosExitosos.filter(e => e.calificacion >= 4).map(e => ({
        calificacion: e.calificacion,
        comentario: e.comentario,
        resumen: e.documentoResumen,
      })),
    );

    await this.proyectoRepository.update(id, { documentoFormulado, estado: 'completado' });
    return await this.obtenerPorId(id);
  }

  async actualizarRespuestas(id: string, respuestas: object): Promise<Proyecto | null> {
    await this.proyectoRepository.update(id, { respuestas });
    return await this.obtenerPorId(id);
  }

  async guardarServicios(id: string, serviciosAdicionales: object): Promise<Proyecto | null> {
    await this.proyectoRepository.update(id, { serviciosAdicionales });
    return await this.obtenerPorId(id);
  }

  async actualizarEstado(id: string, estado: string): Promise<Proyecto | null> {
    await this.proyectoRepository.update(id, { estado });
    return await this.obtenerPorId(id);
  }

  // Guardar feedback del usuario — alimenta el autoaprendizaje
  async guardarFeedback(
    proyectoId: string,
    calificacion: number,
    comentario?: string,
  ): Promise<FeedbackDocumento> {
    const proyecto = await this.obtenerPorId(proyectoId);
    const feedback = this.feedbackRepository.create({
      proyectoId,
      calificacion: Math.min(5, Math.max(1, calificacion)),
      comentario,
      tipoServicio: proyecto?.tipoServicio,
      area: proyecto?.area,
      documentoResumen: proyecto?.documentoFormulado?.substring(0, 1200),
    });
    return await this.feedbackRepository.save(feedback);
  }

  async obtenerFeedbackStats(): Promise<any> {
    const feedbacks = await this.feedbackRepository.find({ order: { creadoEn: 'DESC' }, take: 100 });
    if (!feedbacks.length) return { total: 0, promedio: 0, distribucion: {} };

    const total = feedbacks.length;
    const suma = feedbacks.reduce((acc, f) => acc + f.calificacion, 0);
    const promedio = parseFloat((suma / total).toFixed(2));

    const distribucion: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach(f => { distribucion[f.calificacion] = (distribucion[f.calificacion] || 0) + 1; });

    return { total, promedio, distribucion };
  }
}
