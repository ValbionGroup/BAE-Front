import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ParametresModules } from './modules';

describe(ParametresModules.name, () => {
  let component: ParametresModules;
  let fixture: ComponentFixture<ParametresModules>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametresModules],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ParametresModules);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
