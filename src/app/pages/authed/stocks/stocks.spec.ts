import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Stocks } from './stocks';

describe(Stocks.name, () => {
  let component: Stocks;
  let fixture: ComponentFixture<Stocks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Stocks],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Stocks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
