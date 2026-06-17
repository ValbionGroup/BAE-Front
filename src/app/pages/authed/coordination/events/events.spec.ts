import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CoordinationEvents } from './events';

describe(CoordinationEvents.name, () => {
  let component: CoordinationEvents;
  let fixture: ComponentFixture<CoordinationEvents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinationEvents],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinationEvents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
