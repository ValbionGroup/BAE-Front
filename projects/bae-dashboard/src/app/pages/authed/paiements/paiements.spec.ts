import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Paiements } from './paiements';

describe(Paiements.name, () => {
  let component: Paiements;
  let fixture: ComponentFixture<Paiements>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Paiements],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Paiements);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
