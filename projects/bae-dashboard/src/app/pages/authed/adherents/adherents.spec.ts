import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Adherents } from './adherents';
import { API_BASE_URL, DropdownService, type DropdownItemAction } from '@bae/ui';
import { ModalService } from '#shared/components/modal/modal.service';
import type { ComponentModalConfig } from '#shared/components/modal/modal.models';
import { ClientEditModal } from '#shared/components/modal/client-edit-modal/client-edit-modal';
import { SubscriptionCreateModal } from '#shared/components/modal/subscription-create-modal/subscription-create-modal';
import type { ClientDetail, ClientRow, ClientsSummary } from './adherents.types';

const baseUrl = 'http://api.test/v1';

interface PageApi {
  activeFilter: { set(value: number): void };
  searchQuery: { set(value: string): void };
  visibleClients(): readonly ClientRow[];
  sortLabel(): string;
  filterTabs(): readonly string[];
  stats(): readonly { k: string; v: string }[];
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
  registeredAt: '2025-09-12',
  note: 'Allergie noix.',
  noteAuthor: 'Sarah K.',
  noteWrittenAt: '2026-01-12T10:00:00.000Z',
  preparationNote: 'Intolérance au lactose',
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
  preOrderCount: 3,
  spentCents: 1500,
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
    // Deux sauts : `loadDetail` attend `getDetail`, qui attend `lastValueFrom`.
    await fixture.whenStable();
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

  it('the expiring tab applies the same rule as the counter it displays', async () => {
    const fixture = await render();
    const page = fixture.componentInstance as unknown as PageApi;

    page.activeFilter.set(3);
    fixture.detectChanges();
    await fixture.whenStable();

    // Camille expire dans 40 jours : à jour, mais hors fenêtre.
    expect(page.visibleClients()).toEqual([]);
  });

  it('lists the non-members under their own tab, not everyone', async () => {
    const fixture = await render();
    const page = fixture.componentInstance as unknown as PageApi;

    page.activeFilter.set(4);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne(`${baseUrl}/clients/3`).flush({ ...DETAIL, ...CLIENTS[2], subscriptions: [] });
    await fixture.whenStable();

    expect(page.visibleClients().map((row) => row.id)).toEqual([3]);
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
      'Expirant dans < 30j · 0',
      'Non-adhérents · 1',
    ]);
  });

  // Le back sert des centimes ; les afficher tels quels annoncerait « 1500 € »
  // pour quinze euros de consommation.
  it('renders the spend in euros, not raw cents', async () => {
    const fixture = await render();
    const page = fixture.componentInstance as unknown as PageApi;

    expect(page.stats().find((tile) => tile.k === 'Dépensé')?.v).toBe('15,00 €');
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

  function chooseSort(fixture: ComponentFixture<Adherents>, label: string): void {
    const el = fixture.nativeElement as HTMLElement;
    const trigger = Array.from(el.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Trier'),
    ) as HTMLButtonElement;
    trigger.click();

    const dropdown = TestBed.inject(DropdownService);
    const items = dropdown.current()!.items as DropdownItemAction[];
    items.find((item) => item.label === label)!.onClick();
    // `DropdownContainer` referme après un clic ; il n'est pas monté ici.
    dropdown.close();
    fixture.detectChanges();
  }

  it('sorts on the expiry, keeping the undated rows last both ways', async () => {
    const fixture = await render();
    const page = fixture.componentInstance as unknown as PageApi;

    chooseSort(fixture, 'Expiration');
    expect(page.visibleClients().map((row) => row.id)).toEqual([2, 1, 3]);

    chooseSort(fixture, 'Expiration');
    expect(page.visibleClients().map((row) => row.id)).toEqual([1, 2, 3]);
    expect(page.sortLabel()).toBe('Expiration ↓');
  });

  it('sorts on the membership status by urgency, not alphabetically', async () => {
    const fixture = await render();
    const page = fixture.componentInstance as unknown as PageApi;

    chooseSort(fixture, 'Cotisation');
    expect(page.visibleClients().map((row) => row.status)).toEqual(['expired', 'active', 'none']);
  });

  function clickAndRead(fixture: ComponentFixture<Adherents>, label: string): ComponentModalConfig {
    const el = fixture.nativeElement as HTMLElement;
    const target = Array.from(el.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(label),
    ) as HTMLButtonElement;
    target.click();

    const open = TestBed.inject(ModalService).modals();
    expect(open.length).toBe(1);
    return open[0] as ComponentModalConfig;
  }

  it('opens the edit modal on the client the sheet is showing', async () => {
    const fixture = await render();
    const modal = clickAndRead(fixture, 'Modifier');

    expect(modal.component).toBe(ClientEditModal);
    expect((modal.inputs?.['client'] as ClientDetail).id).toBe(DETAIL.id);
  });

  it('renews from the sheet, on the selected client', async () => {
    const fixture = await render();
    const modal = clickAndRead(fixture, 'Renouveler');

    expect(modal.component).toBe(SubscriptionCreateModal);
    expect((modal.inputs?.['client'] as ClientRow).id).toBe(1);
  });

  /**
   * `expiresAt`, `subscribedAt` et `registeredAt` arrivent en `YYYY-MM-DD`
   * (`toISODate()`). Lus par `new Date`, ils partent en UTC pour être réaffichés
   * en heure locale, ce qui les recule d'un jour à l'ouest de Greenwich.
   *
   * ⚠️ Ne mord qu'à l'ouest de Greenwich : ailleurs le décalage ne traverse pas
   * la frontière du jour.
   */
  it('renders a date-only field on the day the API sent', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('31 août 2026');
    expect(text).toContain('12 sept. 2025');
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

  /**
   * Deux notes aux propriétaires opposés cohabitent sur la fiche : celle du
   * bureau *sur* l'adhérent, et celle que l'adhérent écrit sur lui-même. Les
   * confondre ferait lire une allergie comme un commentaire interne.
   */
  it('distingue la consigne de l’adhérent de la note interne', async () => {
    const fixture = await render();
    const host = fixture.nativeElement as HTMLElement;

    const consigne = host.querySelector('[data-block="preparation-note"]');
    const interne = host.querySelector('[data-block="staff-note"]');

    expect(consigne?.textContent).toContain('Intolérance au lactose');
    expect(consigne?.textContent).not.toContain('Allergie noix.');
    expect(interne?.textContent).toContain('Allergie noix.');
  });

  it('dit qu’il n’y a aucune consigne plutôt que de laisser un vide', async () => {
    const fixture = TestBed.createComponent(Adherents);
    fixture.detectChanges();

    http.expectOne(`${baseUrl}/clients`).flush(CLIENTS);
    http.expectOne(`${baseUrl}/clients/summary`).flush(SUMMARY);
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectOne(`${baseUrl}/clients/1`).flush({ ...DETAIL, preparationNote: null });
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();

    const block = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-block="preparation-note"]',
    );
    expect(block?.textContent).toContain('Aucune consigne');
  });
});
