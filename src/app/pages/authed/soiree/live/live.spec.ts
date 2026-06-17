import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SoireeLive } from './live';

describe(SoireeLive.name, () => {
  let component: SoireeLive;
  let fixture: ComponentFixture<SoireeLive>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoireeLive],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SoireeLive);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
