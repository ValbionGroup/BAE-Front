import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { CoordinationEvents } from './events';
import { CoordinationService } from '#core/services/coordination/coordination-service';

const API_DATA = {
  events: [{ id: 1, name: 'Soirée test', date: '2099-06-01', duration: null }],
  members: [],
  jobs: [],
  eventJobs: [],
  assignments: [],
  responses: [],
  preferences: [],
};

describe(CoordinationEvents.name, () => {
  let fixture: ComponentFixture<CoordinationEvents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinationEvents],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CoordinationService, useValue: { loadAll: () => of(API_DATA) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinationEvents);
    await fixture.whenStable();
  });

  it('leaves the mobile sheet closed despite preselecting the next event', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    // La soirée à venir remplit la colonne de droite en desktop, mais sur téléphone la
    // feuille resterait par-dessus la liste sans que l'utilisateur l'ait demandée.
    expect(el.textContent).toContain('Soirée test');
    expect((el.querySelector('[data-testid="sheet-panel"]') as HTMLElement).className).toContain(
      'translate-y-full',
    );
  });
});
