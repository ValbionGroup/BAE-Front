import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SoireeBilan } from './bilan';

describe(SoireeBilan.name, () => {
  let component: SoireeBilan;
  let fixture: ComponentFixture<SoireeBilan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoireeBilan],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SoireeBilan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
