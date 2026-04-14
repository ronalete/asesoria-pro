import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('feedback_documentos')
export class FeedbackDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  proyectoId: string;

  @Column({ type: 'int' })
  calificacion: number; // 1 a 5

  @Column({ type: 'text', nullable: true })
  comentario: string;

  @Column({ nullable: true })
  tipoServicio: string;

  @Column({ nullable: true })
  area: string;

  @Column({ type: 'text', nullable: true })
  documentoResumen: string; // primeros 1000 chars del documento formulado

  @CreateDateColumn()
  creadoEn: Date;
}
