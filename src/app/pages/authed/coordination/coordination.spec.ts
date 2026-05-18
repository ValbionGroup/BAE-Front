import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Coordination } from './coordination';
import { CoordinationService, type CoordinationApiData } from '#core/services/coordination/coordination-service';

describe(Coordination.name, () => {
  let component: Coordination;
  let fixture: ComponentFixture<Coordination>;

  beforeEach(async () => {
    const mockData: CoordinationApiData = {
      events: [{ id: 1, name: 'Soiree Test', date: new Date().toISOString() }],
      members: [{ id: 1, firstName: 'Test', lastName: 'User', role: 'member', points: 80 }],
      jobs: [{ id: 1, name: 'Barman' }],
      eventJobs: [{ eventId: 1, jobId: 1, count: 1 }],
      assignments: [],
      responses: [{ memberId: 1, eventId: 1, isAvailable: true }],
      preferences: [{ memberId: 1, jobId: 1, preferenceRank: 1 }],
    };
    const mockService = {
      loadAll: () => of(mockData),
      assign: () => of(null),
      unassign: () => of(null),
      createJob: () => of(null),
      updateJob: () => of(null),
      deleteJob: () => of(null),
      createEventJob: () => of(null),
      updateEventJob: () => of(null),
      deleteEventJob: () => of(null),
    };

    await TestBed.configureTestingModule({
      imports: [Coordination],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } },
        { provide: CoordinationService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Coordination);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
