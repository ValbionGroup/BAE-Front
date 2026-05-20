import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ParametresSecurite } from './securite';

describe(ParametresSecurite.name, () => {
  let component: ParametresSecurite;
  let fixture: ComponentFixture<ParametresSecurite>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametresSecurite],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ParametresSecurite);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
