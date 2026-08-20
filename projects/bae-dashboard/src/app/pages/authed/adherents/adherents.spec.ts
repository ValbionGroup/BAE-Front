import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Adherents } from './adherents';
import { API_BASE_URL } from '@bae/ui';
import type { ClientDetail, ClientRow, ClientsSummary } from './adherents.types';

const baseUrl = 'http://api.test/v1';

interface PageApi {
  activeFilter: { set(value: number): void };
  searchQuery: { set(value: string): void };
  visibleClients(): readonly ClientRow[];
  filterTabs(): readonly string[];
  stats(): readonly { k: string; v: string; missing?: string }[];
}

const CLIENTS: ClientRow[] = [
  {
    id: 1,
    membershipNumber: 'ADH-2025-0001',
    name: 'Camille Renard',
    email: 'c.renard@etu.ec.fr',
    promotion: '2A · Alt.',
    status: 'active',
    expiresAt: '2026-08-31',
    daysUntilExpiry: 40,
  },
  {
    id: 2,
    membershipNumber: 'ADH-2024-0002',
    name: 'Sofia Lemaire',
    email: 's.lemaire@etu.ec.fr',
    promotion: '4A · Alt.',
    status: 'expired',
    expiresAt: '2025-08-31',
    daysUntilExpiry: -350,
  },
  {
    id: 3,
    membershipNumber: 'EXT-2025-0003',
    name: null,
    email: 'p.aubry@gmail.com',
    promotion: null,
    status: 'none',
    expiresAt: null,
    daysUntilExpiry: null,
  },
];

const SUMMARY: ClientsSummary = {
  total: 3,
  upToDate: 1,
  expired: 1,
  withoutSubscription: 1,
  expiringSoon: 0,
};

const DETAIL: ClientDetail = {
  ...CLIENTS[0],
  school: 'ENSEIRB-MATMECA',
  phone: '06 24 31 88 02',
  registeredAt: '2025-09-12',
  note: 'Allergie noix.',
  noteAuthor: 'Sarah K.',
  noteWrittenAt: '2026-01-12T10:00:00.000Z',
  subscriptions: [
    {
      fastPassId: 1,
      label: '2025-2026',
      subscribedAt: '2025-09-12',
      expiresAt: '2026-09-12',
      status: 'active',
      amount: 15,
      paymentMethod: 'lydia',
    },
  ],
};

describe(Adherents.name, () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Adherents],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Rend la page et sert la liste, les compteurs, puis le détail sélectionné d'office. */
  async function render(): Promise<ComponentFixture<Adherents>> {
    const fixture = TestBed.createComponent(Adherents);
    fixture.detectChanges();

    http.expectOne(`${baseUrl}/clients`).flush(CLIENTS);
    http.expectOne(`${baseUrl}/clients/summary`).flush(SUMMARY);
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectOne(`${baseUrl}/clients/1`).flush(DETAIL);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('lists what the API returns', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Camille Renard');
    expect(text).toContain('ADH-2025-0001');
  });

  it('falls back to the email when no name is known', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('p.aubry@gmail.com');
  });

  it('the tabs actually filter, they do not only restyle', async () => {
    const fixture = await render();
    const page = fixture.componentInstance as unknown as PageApi;

    page.activeFilter.set(2);
    fixture.detectChanges();
    await fixture.whenStable();
    // Changer d'onglet déplace la sélection d'office sur la première ligne visible.
    http.expectOne(`${baseUrl}/clients/2`).flush({ ...DETAIL, ...CLIENTS[1], subscriptions: [] });
    await fixture.whenStable();

    const visible = page.visibleClients();
    expect(visible.length).toBe(1);
    expect(visible[0].status).toBe('expired');
  });

  it('searches on name, email and membership number', async () => {
    const fixture = await render();
    const page = fixture.componentInstance as unknown as PageApi;

    page.searchQuery.set('EXT-2025');
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne(`${baseUrl}/clients/3`).flush({ ...DETAIL, ...CLIENTS[2], subscriptions: [] });
    await fixture.whenStable();

    expect(page.visibleClients().length).toBe(1);
    expect(page.visibleClients()[0].id).toBe(3);
  });

  it('the counters come from the summary, never recomputed here', async () => {
    const fixture = await render();
    const page = fixture.componentInstance as unknown as PageApi;
    expect(page.filterTabs()).toEqual([
      'Tous · 3',
      'À jour · 1',
      'Expirés · 1',
      'Non-adhérents · 1',
    ]);
  });

  it('marks the tiles it cannot compute instead of inventing a number', async () => {
    const fixture = await render();
    const page = fixture.componentInstance as unknown as PageApi;

    const spent = page.stats().find((tile) => tile.k === 'Dépensé');
    expect(spent?.v).toBe('—');
    expect(spent?.missing).toBeTruthy();
  });

  it('only opens the mobile sheet on an explicit row click', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const panelClasses = () =>
      (el.querySelector('[data-testid="sheet-panel"]') as HTMLElement).className;

    // La première ligne est présélectionnée pour remplir la colonne desktop : cela ne
    // doit pas déployer la feuille par-dessus la liste sur téléphone.
    expect(panelClasses()).toContain('translate-y-full');

    (el.querySelector('[role="button"][aria-current]') as HTMLElement).click();
    fixture.detectChanges();
    expect(panelClasses()).not.toContain('translate-y-full');

    (el.querySelector('[data-testid="sheet-close"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    // La fermeture garde la sélection : la remettre à `null` relancerait la
    // présélection, qui rouvrirait aussitôt la feuille.
    expect(panelClasses()).toContain('translate-y-full');
  });

  it('shows the API error rather than an empty list', async () => {
    const fixture = TestBed.createComponent(Adherents);
    fixture.detectChanges();

    // Le compteur d'abord : `forkJoin` désabonne ses frères dès la première
    // erreur, et une requête annulée ne peut plus être servie.
    http.expectOne(`${baseUrl}/clients/summary`).flush(SUMMARY);
    http.expectOne(`${baseUrl}/clients`).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    // Deuxième tour : le premier rend l'état d'avant le `catch` du store.
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Impossible de charger les adhérents.');
  });
});
