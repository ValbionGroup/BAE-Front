import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pills } from './pills';

describe('Pills', () => {
  let component: Pills;
  let fixture: ComponentFixture<Pills>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pills],
    }).compileComponents();

    fixture = TestBed.createComponent(Pills);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
