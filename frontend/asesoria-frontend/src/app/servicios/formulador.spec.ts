import { TestBed } from '@angular/core/testing';

import { Formulador } from './formulador';

describe('Formulador', () => {
  let service: Formulador;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Formulador);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
