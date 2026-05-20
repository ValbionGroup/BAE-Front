import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CoordinationEventDetail } from './event-detail';

describe(CoordinationEventDetail.name, () => {
  let component: CoordinationEventDetail;
  let fixture: ComponentFixture<CoordinationEventDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinationEventDetail],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinationEventDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
