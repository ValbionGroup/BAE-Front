import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RosterAside } from './roster-aside';

describe(RosterAside.name, () => {
  let component: RosterAside;
  let fixture: ComponentFixture<RosterAside>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RosterAside],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RosterAside);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
