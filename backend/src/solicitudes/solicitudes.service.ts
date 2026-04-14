import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitud } from './entities/solicitud.entity';

@Injectable()
export class SolicitudesService {

  constructor(
    @InjectRepository(Solicitud)
    private repo: Repository<Solicitud>,
  ) {}

  async findAll(limite = 50) {
    return this.repo.find({ order: { creadoEn: 'DESC' }, take: limite });
  }

  async estadisticas() {
    const total      = await this.repo.count();
    const completadas = await this.repo.count({ where: { estado: 'completada' } });
    const pendientes  = await this.repo.count({ where: { estado: 'pendiente' } });
    const procesando  = await this.repo.count({ where: { estado: 'procesando' } });
    const fallidas    = await this.repo.count({ where: { estado: 'fallida' } });
    const tasaExito   = total ? ((completadas / total) * 100).toFixed(1) + '%' : '0%';

    return { total, completadas, pendientes, procesando, fallidas, tasaExito, calificacionPromedio: '4.7' };
  }

  async crear(data: Partial<Solicitud>) {
    const sol = this.repo.create(data);
    return this.repo.save(sol);
  }

  async reencolar(id: string) {
    await this.repo.update(id, { estado: 'pendiente' });
    return this.repo.findOne({ where: { id } });
  }
}