import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { LogistiqueEvents } from './events';

describe(LogistiqueEvents.name, () => {
  let component: LogistiqueEvents;
  let fixture: ComponentFixture<LogistiqueEvents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogistiqueEvents],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(LogistiqueEvents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
