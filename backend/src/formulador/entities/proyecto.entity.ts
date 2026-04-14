// Entidad que representa un proyecto formulado en el sistema
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('proyectos')
export class Proyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Título del proyecto
  @Column({ nullable: true })
  titulo: string;

  // Tipo de servicio: academico, personal, empresarial, publico
  @Column({ nullable: true })
  tipoServicio: string;

  // Campos académicos
  @Column({ nullable: true })
  carrera: string;

  @Column({ nullable: true })
  semestre: string;

  @Column({ nullable: true })
  universidad: string;

  @Column({ nullable: true })
  materia: string;

  // Campos empresariales / públicos
  @Column({ nullable: true })
  organizacion: string;

  @Column({ nullable: true })
  sector: string;

  // Tipo de proyecto detectado por Claude
  @Column({ nullable: true })
  tipoProyecto: string;

  // Área del conocimiento
  @Column({ nullable: true })
  area: string;

  // Contenido extraído del documento guía
  @Column({ type: 'text', nullable: true })
  contenidoGuia: string;

  // Nombre del archivo original subido
  @Column({ nullable: true })
  nombreArchivo: string;

  // Respuestas del usuario al chatbot
  @Column({ type: 'jsonb', nullable: true })
  respuestas: object;

  // Documento formulado generado por Claude
  @Column({ type: 'text', nullable: true })
  documentoFormulado: string;

  // Estado del proceso
  @Column({ default: 'pendiente' })
  estado: string;

  // Fase del proyecto de grado
  @Column({ nullable: true })
  faseGrado: string;

  // Modalidad del proyecto de grado
  @Column({ nullable: true })
  modalidadGrado: string;

  // Servicios adicionales solicitados
  @Column({ type: 'jsonb', nullable: true })
  serviciosAdicionales: object;

  // Email del cliente
  @Column({ nullable: true })
  emailCliente: string;

  // Usuario propietario del proyecto
  @Column({ nullable: true })
  usuarioId: string;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
