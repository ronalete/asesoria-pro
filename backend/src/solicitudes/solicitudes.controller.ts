import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';

@Controller('solicitudes')
export class SolicitudesController {

  constructor(private readonly service: SolicitudesService) {}

  @Get()
  async findAll(@Query('limite') limite?: string) {
    const data = await this.service.findAll(limite ? parseInt(limite, 10) : 50);
    return { data: { data, total: data.length } };
  }

  @Get('estadisticas')
  async estadisticas() {
    const data = await this.service.estadisticas();
    return { data };
  }

  @Post()
  async crear(@Body() body: any) {
    const data = await this.service.crear(body);
    return { data };
  }

  @Post(':id/reencolar')
  async reencolar(@Param('id') id: string) {
    const data = await this.service.reencolar(id);
    return { data };
  }
}