import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Formulador } from './formulador';

describe('Formulador', () => {
  let component: Formulador;
  let fixture: ComponentFixture<Formulador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Formulador],
    }).compileComponents();

    fixture = TestBed.createComponent(Formulador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
