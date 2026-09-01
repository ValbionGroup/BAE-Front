import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL, DropdownService } from '@bae/ui';
import { vi } from 'vitest';

import { Analyse } from './analyse';

describe(Analyse.name, () => {
  let fixture: ComponentFixture<Analyse>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analyse],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Analyse);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
    fixture.detectChanges();
  });

  /**
   * `async` à dessein : le store résout sa réponse via `lastValueFrom`, donc
   * dans une micro-tâche. Un `detectChanges()` immédiat rendrait l'écran vide.
   */
  async function flush(orderCounts: number[]): Promise<void> {
    httpMock.expectOne((r) => r.url === `${baseUrl}/analytics/season`).flush({
      season: { startYear: 2025, label: 'Saison 2025-2026' },
      seasons: [{ startYear: 2025, label: 'Saison 2025-2026', eventCount: orderCounts.length }],
      kpis: {
        cashedCents: 790000,
        cashedDeltaPct: 18,
        avgOrdersPerEvent: 285,
        ordersStdDev: 48,
        avgBasketCents: 580,
        avgBasketDeltaCents: 40,
        presenceRate: 0.92,
        presenceDeltaPts: -3,
      },
      events: orderCounts.map((orderCount, index) => ({
        id: index + 1,
        name: `Soirée ${index + 1}`,
        date: `2025-09-${String(index + 1).padStart(2, '0')}T20:00:00.000+00:00`,
        orderCount,
        cashedCents: 100000,
        presentCount: 20,
        respondentCount: 22,
        upcoming: false,
      })),
      prediction: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('should create', async () => {
    await flush([200]);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('rend les quatre KPI', async () => {
    await flush([200]);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Revenus saison');
    expect(text).toContain('7900,00 €');
    expect(text).toContain('Taux de présence');
  });

  it('calcule les graduations au lieu de les figer à 380', async () => {
    await flush([420]);
    const component = fixture.componentInstance as unknown as {
      chartMax(): number;
      axisTicks(): number[];
    };

    expect(component.chartMax()).toBe(450);
    expect(component.axisTicks()).toEqual([0, 113, 225, 338]);
  });

  it('garde un plancher quand la saison est vide', async () => {
    await flush([]);
    const component = fixture.componentInstance as unknown as { chartMax(): number };
    expect(component.chartMax()).toBe(50);
  });

  it('propose les saisons connues dans le menu Période', async () => {
    await flush([200]);
    const dropdown = TestBed.inject(DropdownService);
    const spy = vi.spyOn(dropdown, 'toggle');
    const button = document.createElement('button');

    const component = fixture.componentInstance as unknown as {
      openSeasons(event: MouseEvent): void;
    };
    component.openSeasons({ currentTarget: button } as unknown as MouseEvent);

    expect(spy).toHaveBeenCalledTimes(1);
    const items = spy.mock.calls[0][0].items;
    expect(items.map((i) => ('label' in i ? i.label : '—'))).toContain('Saison 2025-2026');
  });

  it('exporte l’historique en CSV, entêtes comprises', async () => {
    await flush([200]);
    const component = fixture.componentInstance as unknown as { csvContent(): string };

    const lines = component.csvContent().split('\n');
    expect(lines[0]).toBe('Soirée;Date;Commandes;Encaissé;Présents;Répondants');
    expect(lines[1]).toBe('Soirée 1;01/09;200;1000,00;20;22');
  });

  it('titre la page avec la saison chargée', async () => {
    await flush([200]);
    const component = fixture.componentInstance as unknown as { subtitle(): string };
    expect(component.subtitle()).toBe('Saison 2025-2026');
  });

  it('ouvre le bilan d’une soirée achevée', async () => {
    await flush([200]);
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const component = fixture.componentInstance as unknown as {
      openSoiree(row: { id: number; clickable: boolean }): void;
    };

    component.openSoiree({ id: 7, clickable: true });
    expect(spy).toHaveBeenCalledWith(['/soiree/bilan', 7]);

    spy.mockClear();
    component.openSoiree({ id: 8, clickable: false });
    expect(spy).not.toHaveBeenCalled();
  });
});
