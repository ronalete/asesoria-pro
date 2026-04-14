import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export interface SeccionAnalizada {
  texto: string;
  tipo: 'ia_generado' | 'plagio_potencial' | 'mixto' | 'original';
  confianza: number;
  evidencia: string;
  recomendacion: string;
}

@Entity('analisis_deteccion')
export class AnalisisDeteccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  textoAnalizado: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  scoreIA: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  scorePlagio: number;

  @Column({ length: 20, default: 'bajo' })
  clasificacion: string;

  @Column({ type: 'text', nullable: true })
  resumen: string;

  @Column({ type: 'jsonb', nullable: true })
  secciones: SeccionAnalizada[];

  @Column({ type: 'jsonb', nullable: true })
  recomendaciones: string[];

  @Column({ nullable: true })
  emailCliente: string;

  @CreateDateColumn()
  creadoEn: Date;
}
