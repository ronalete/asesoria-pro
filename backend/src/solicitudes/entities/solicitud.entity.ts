import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('solicitudes')
export class Solicitud {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  emailCliente: string;

  @Column({ default: 'estudiante' })
  tipoCliente: string;

  @Column()
  area: string;

  @Column({ default: 'academico' })
  tipoServicio: string;

  @Column({ default: 'pendiente' })
  estado: string;

  @Column({ type: 'float', nullable: true })
  scoreCalidad: number;

  @Column({ type: 'text', nullable: true })
  consulta: string;

  @Column({ type: 'text', nullable: true })
  respuesta: string;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}