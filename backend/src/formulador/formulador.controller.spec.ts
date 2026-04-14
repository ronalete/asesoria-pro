import { Test, TestingModule } from '@nestjs/testing';
import { FormuladorController } from './formulador.controller';

describe('FormuladorController', () => {
  let controller: FormuladorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormuladorController],
    }).compile();

    controller = module.get<FormuladorController>(FormuladorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
