import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CaisseCloture } from './cloture';

describe(CaisseCloture.name, () => {
  let component: CaisseCloture;
  let fixture: ComponentFixture<CaisseCloture>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaisseCloture],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CaisseCloture);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
