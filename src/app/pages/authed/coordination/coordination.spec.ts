import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Coordination } from './coordination';

describe('Coordination', () => {
  let component: Coordination;
  let fixture: ComponentFixture<Coordination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Coordination],
    }).compileComponents();

    fixture = TestBed.createComponent(Coordination);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
