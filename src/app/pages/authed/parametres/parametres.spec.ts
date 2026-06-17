import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Parametres } from './parametres';

describe(Parametres.name, () => {
  let component: Parametres;
  let fixture: ComponentFixture<Parametres>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Parametres],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Parametres);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
