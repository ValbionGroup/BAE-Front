import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SoireeBilan } from './bilan';
import { PrintService } from '#core/services/print/print-service';
import { EventsStore } from '#core/store/events.store';
import { API_BASE_URL } from '@bae/ui';
import type { EventSummary } from '#core/services/summary/event-summary-service';
import { vi } from 'vitest';
import { of } from 'rxjs';

function summary(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    eventId: 7,
    orderCount: 2,
    cancelledCount: 0,
    revenueCents: 1000,
    netRevenueCents: 1000,
    cashedCents: 400,
    sponsoredCents: 600,
    receivableCents: 600,
    grantedCents: 0,
    payerName: 'BDE',
    receivableByCategory: [{ label: 'Staff BDE', dueCents: 600 }],
    grantedByCategory: [],
    cashedByMethod: [{ method: 'cash', amount: 400, count: 2 }],
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
    component['summary'].set(
      summary({ sponsoredCents: 0, receivableCents: 0, receivableByCategory: [] }),
    );
    expect(component['receivable']()).toBeNull();
  });

  /**
   * Le défaut visé : le bloc « À recouvrer auprès de … » s'ouvrait sur une
   * soirée entièrement offerte par le BAE, où l'écart consenti n'est nul pour
   * personne mais n'est dû par personne non plus.
   */
  it('n’ouvre aucune créance sur une soirée entièrement offerte', () => {
    component['summary'].set(
      summary({
        sponsoredCents: 600,
        receivableCents: 0,
        grantedCents: 600,
        payerName: null,
        receivableByCategory: [],
        grantedByCategory: [{ label: 'Invités du BAE', grantedCents: 600 }],
      }),
    );

    expect(component['receivable']()).toBeNull();
    expect(component['granted']()).toEqual({
      total: '6,00',
      categories: [{ label: 'Invités du BAE', granted: '6,00' }],
    });
  });

  it('ne retient en créance que la part réellement refacturable', () => {
    component['summary'].set(
      summary({
        revenueCents: 2250,
        netRevenueCents: 1750,
        sponsoredCents: 1100,
        receivableCents: 600,
        grantedCents: 500,
        receivableByCategory: [{ label: 'Staff BDE', dueCents: 600 }],
        grantedByCategory: [{ label: 'Invités du BAE', grantedCents: 500 }],
      }),
    );

    // Les 500 offerts ne doivent pas gonfler ce qu'on réclame au BDE.
    expect(component['receivable']()!.total).toBe('6,00');
    expect(component['granted']()!.total).toBe('5,00');
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

  it('additionne les encaissements en centimes et les affiche en euros', () => {
    // `amount` arrivait en euros là où `revenueCents` arrivait en centimes, sur
    // la même charge utile : l'écart affiché valait 100 fois la recette.
    component['summary'].set(
      summary({
        revenueCents: 1000,
        cashedByMethod: [
          { method: 'cash', amount: 400, count: 2 },
          { method: 'lydia', amount: 600, count: 1 },
        ],
      }),
    );

    expect(component['cashedTotal']()).toBe(1000);
    expect(component['gap']()).toBe(0);
    expect(component['cashed']()[0].amount).toBe('4,00');
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

/** Une soirée telle que `GET /events` la sert. */
function apiEvent(id: string, name: string, status: string, date: string) {
  return { id, name, date, status };
}

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(19, 30, 0, 0);
  return d.toISOString();
};

describe(`${SoireeBilan.name} — quelle soirée le bilan raconte`, () => {
  async function render(routeId: string | null): Promise<SoireeBilan> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SoireeBilan],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap(routeId === null ? {} : { id: routeId })),
            snapshot: { paramMap: convertToParamMap(routeId === null ? {} : { id: routeId }) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SoireeBilan);
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  async function loadEvents(events: unknown[]): Promise<void> {
    const http = TestBed.inject(HttpTestingController);
    const loaded = TestBed.inject(EventsStore).load();
    http.expectOne('http://api.test/v1/events').flush(events);
    await loaded;
  }

  /**
   * **Le bug d'origine.** Le tri « la dernière clôturée par date décroissante »
   * désignait, en base de dev, une soirée `completed` datée de 2027 sans menu ni
   * commande : tous les KPI à zéro, et un écran qu'on croyait cassé. « Clôturée »
   * n'implique pas « passée », et rien ne l'impose.
   */
  it('ignore une soirée clôturée datée dans le futur', async () => {
    const component = await render(null);
    await loadEvents([
      apiEvent('99', 'Soirée fantôme de 2027', 'completed', iso(400)),
      apiEvent('7', 'Soirée de samedi', 'completed', iso(-2)),
    ]);

    expect(component['target']()?.name).toBe('Soirée de samedi');
  });

  /**
   * Par où la clôture arrive : elle navigue avec l'identifiant de la soirée
   * qu'elle vient de fermer, plutôt que de laisser le bilan deviner.
   */
  it('vise la soirée nommée par l’URL, même si une autre est plus récente', async () => {
    const component = await render('7');
    await loadEvents([
      apiEvent('12', 'Soirée de vendredi', 'completed', iso(-1)),
      apiEvent('7', 'Soirée de samedi', 'completed', iso(-2)),
    ]);

    expect(component['target']()?.name).toBe('Soirée de samedi');
  });

  /** Le sélecteur ne propose que ce qui est clôturé, du plus récent au plus ancien. */
  it('liste les soirées clôturées de la plus récente à la plus ancienne', async () => {
    const component = await render(null);
    await loadEvents([
      apiEvent('7', 'Soirée de samedi', 'completed', iso(-2)),
      apiEvent('12', 'Soirée de vendredi', 'completed', iso(-1)),
      apiEvent('3', 'Soirée en cours', 'ongoing', iso(0)),
    ]);

    expect(component['closedEvents']().map((event) => event.name)).toEqual([
      'Soirée de vendredi',
      'Soirée de samedi',
    ]);
  });

  /**
   * « Aucune soirée à analyser » avant même d'avoir demandé la liste est un
   * mensonge — celui-là même qui faisait croire l'écran cassé.
   */
  it('ne conclut à l’absence de soirée qu’une fois la liste chargée', async () => {
    const component = await render(null);
    expect(component['ready']()).toBe(false);

    await loadEvents([]);
    expect(component['ready']()).toBe(true);
    expect(component['target']()).toBeNull();
  });
});
