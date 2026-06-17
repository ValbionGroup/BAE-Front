import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Adherents } from './adherents';

describe(Adherents.name, () => {
  let component: Adherents;
  let fixture: ComponentFixture<Adherents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Adherents],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Adherents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
