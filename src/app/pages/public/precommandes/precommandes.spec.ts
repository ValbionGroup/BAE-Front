import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Precommandes } from './precommandes';

describe(Precommandes.name, () => {
  let component: Precommandes;
  let fixture: ComponentFixture<Precommandes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Precommandes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Precommandes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
