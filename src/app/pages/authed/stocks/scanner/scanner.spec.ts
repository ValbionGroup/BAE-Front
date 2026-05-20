import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { StocksScanner } from './scanner';

describe(StocksScanner.name, () => {
  let component: StocksScanner;
  let fixture: ComponentFixture<StocksScanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StocksScanner],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(StocksScanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
