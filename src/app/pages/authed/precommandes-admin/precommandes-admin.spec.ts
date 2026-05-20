import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PrecommandesAdmin } from './precommandes-admin';

describe(PrecommandesAdmin.name, () => {
  let component: PrecommandesAdmin;
  let fixture: ComponentFixture<PrecommandesAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrecommandesAdmin],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PrecommandesAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
