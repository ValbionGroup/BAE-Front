import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ParametresIntegrations } from './integrations';

describe(ParametresIntegrations.name, () => {
  let component: ParametresIntegrations;
  let fixture: ComponentFixture<ParametresIntegrations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametresIntegrations],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ParametresIntegrations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
