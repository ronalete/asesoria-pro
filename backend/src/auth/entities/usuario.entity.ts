import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  nombre: string;

  @Column({ unique: true, length: 200 })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  rol: string;

  @Column({ default: false })
  verificado: boolean;

  @Column({ nullable: true })
  tokenVerificacion: string;

  @CreateDateColumn()
  creadoEn: Date;
}
