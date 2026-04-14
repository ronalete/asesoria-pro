import { Test, TestingModule } from '@nestjs/testing';
import { FormuladorService } from './formulador.service';

describe('FormuladorService', () => {
  let service: FormuladorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormuladorService],
    }).compile();

    service = module.get<FormuladorService>(FormuladorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
