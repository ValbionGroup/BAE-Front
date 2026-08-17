import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DropdownContainer } from './dropdown-container';

describe(DropdownContainer.name, () => {
  let component: DropdownContainer;
  let fixture: ComponentFixture<DropdownContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownContainer],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DropdownContainer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
