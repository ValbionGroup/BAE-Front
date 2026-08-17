import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { TooltipContainer } from './tooltip-container';

describe(TooltipContainer.name, () => {
  let component: TooltipContainer;
  let fixture: ComponentFixture<TooltipContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipContainer],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipContainer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
