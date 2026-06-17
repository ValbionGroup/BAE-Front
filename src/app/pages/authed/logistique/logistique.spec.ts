import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Logistique } from './logistique';

describe(Logistique.name, () => {
  let component: Logistique;
  let fixture: ComponentFixture<Logistique>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Logistique],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Logistique);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
