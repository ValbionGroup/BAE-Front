import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Analyse } from './analyse';

describe(Analyse.name, () => {
  let component: Analyse;
  let fixture: ComponentFixture<Analyse>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analyse],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Analyse);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
