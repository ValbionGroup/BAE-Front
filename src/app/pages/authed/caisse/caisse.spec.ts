import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Caisse } from './caisse';

describe(Caisse.name, () => {
  let component: Caisse;
  let fixture: ComponentFixture<Caisse>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Caisse],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Caisse);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
