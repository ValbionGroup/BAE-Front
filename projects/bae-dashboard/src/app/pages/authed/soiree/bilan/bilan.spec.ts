import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SoireeBilan } from './bilan';
import { PrintService } from '#core/services/print/print-service';
import { EventsStore } from '#core/store/events.store';
import { API_BASE_URL } from '@bae/ui';
import type { EventSummary } from '#core/services/summary/event-summary-service';
import { vi } from 'vitest';

function summary(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    eventId: 7,
    orderCount: 2,
    cancelledCount: 0,
    revenueCents: 1000,
    cashedCents: 400,
    sponsoredCents: 600,
    payerName: 'BDE',
    receivableByCategory: [{ label: 'Staff BDE', dueCents: 600 }],
    cashedByMethod: [{ method: 'cash', amount: 4, count: 2 }],
    lines: [],
    ...overrides,
  } as EventSummary;
}

describe(SoireeBilan.name, () => {
  let component: SoireeBilan;
  let fixture: ComponentFixture<SoireeBilan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoireeBilan],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SoireeBilan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('n’affiche aucune créance quand rien n’est pris en charge', () => {
    component['summary'].set(summary({ sponsoredCents: 0, receivableByCategory: [] }));
    expect(component['receivable']()).toBeNull();
  });

  it('ventile la créance par catégorie et nomme le payeur', () => {
    component['summary'].set(summary());

    const due = component['receivable']()!;
    expect(due.payerName).toBe('BDE');
    expect(due.total).toBe('6,00');
    expect(due.cashed).toBe('4,00');
    expect(due.categories).toEqual([{ label: 'Staff BDE', due: '6,00' }]);
  });

  it('nomme explicitement un payeur manquant plutôt que de laisser un vide', () => {
    component['summary'].set(summary({ payerName: null }));
    expect(component['receivable']()!.payerName).toBe('payeur non renseigné');
  });

  it('annonce la part à recouvrer dans le KPI de recette', () => {
    component['summary'].set(summary());
    expect(component['kpis']()[0].detail).toBe('dont 6,00 € à recouvrer');
  });

  it('télécharge le justificatif de la soirée visée', async () => {
    const printService = TestBed.inject(PrintService);
    const download = vi.spyOn(printService, 'download').mockImplementation(() => {});
    const http = TestBed.inject(HttpTestingController);

    // `target()` vise la dernière soirée clôturée : il faut donc en charger une.
    const loaded = TestBed.inject(EventsStore).load();
    http.expectOne('http://api.test/v1/events').flush([
      {
        id: '7',
        name: 'Soirée',
        location: 'Foyer',
        date: new Date('2026-02-14T19:00:00Z').toISOString(),
        status: 'completed',
      },
    ]);
    await loaded;
    await fixture.whenStable();

    component['downloadStatement']();

    expect(download).toHaveBeenCalledWith('/events/7/receivables/pdf', expect.any(String));

    for (const pending of http.match(() => true)) pending.flush({});
  });
});
