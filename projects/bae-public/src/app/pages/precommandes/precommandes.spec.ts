import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExternalNavigation } from '@bae/ui';

import { Precommandes } from './precommandes';
import { SessionStore, type SessionStatus } from '../../core/session.store';
import type { PublicEvent, PublicMenu } from '../../core/catalog.models';

const OPEN_EVENT: PublicEvent = {
  id: 1,
  name: 'Soirée Hivernale',
  description: 'Hot-dogs, bières, crêpes',
  startsAt: '2026-02-14T19:30:00.000+01:00',
  preOrdersCloseAt: '2026-02-14T18:30:00.000+01:00',
  capacity: 150,
  placed: 67,
  remaining: 83,
  open: true,
};

const FULL_EVENT: PublicEvent = {
  ...OPEN_EVENT,
  id: 2,
  name: 'Repas Alternants',
  capacity: 80,
  placed: 80,
  remaining: 0,
  open: false,
};

const MENU: PublicMenu = {
  event: OPEN_EVENT,
  discountPercent: 10,
  closeLeadHours: 12,
  lines: [
    {
      productId: 11,
      name: 'Hot-dog classique',
      description: 'Saucisse Strasbourg',
      isVegetarian: false,
      price: 350,
      category: 'Hot-dogs',
    },
    {
      productId: 21,
      name: 'Heineken 33cl',
      description: 'Bière blonde',
      isVegetarian: true,
      price: 250,
      category: 'Boissons',
    },
  ],
};

describe(Precommandes.name, () => {
  let fixture: ComponentFixture<Precommandes>;
  let host: HTMLElement;
  let http: HttpTestingController;

  const mount = async (events: PublicEvent[] = [OPEN_EVENT, FULL_EVENT]): Promise<void> => {
    fixture = TestBed.createComponent(Precommandes);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/public/events')).flush(events);
    await fixture.whenStable();
    fixture.detectChanges();

    const menuRequests = http.match((req) => req.url.includes('/menu'));
    for (const request of menuRequests) request.flush(MENU);

    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  };

  let sessionStatus: ReturnType<typeof signal<SessionStatus>>;
  let navigation: { go: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    // La session est simulée : `SessionStore` interrogerait `/account/profile`,
    // que ces tests n'ont pas à connaître pour parler du panier.
    sessionStatus = signal<SessionStatus>('authenticated');
    navigation = { go: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Precommandes],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            status: sessionStatus.asReadonly(),
            isAuthenticated: computed(() => sessionStatus() === 'authenticated'),
          },
        },
        { provide: ExternalNavigation, useValue: navigation },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const addTo = async (label: string, times = 1): Promise<void> => {
    const button = host.querySelector<HTMLButtonElement>(
      `button[aria-label="Ajouter un ${label}"]`,
    );
    if (button === null) throw new Error(`bouton d’ajout introuvable pour ${label}`);

    for (let i = 0; i < times; i += 1) button.click();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const cartText = (): string =>
    host.querySelector('#menu .lg\\:sticky')?.textContent?.replace(/\s+/g, ' ') ?? '';

  it('demande le catalogue au montage, puis le menu de la soirée mise en avant', async () => {
    await mount();

    expect(host.textContent).toContain('Soirée Hivernale');
    expect(host.textContent).toContain('83 / 150');
  });

  it('part d’un panier vide, sans ligne fantôme', async () => {
    await mount();

    expect(host.textContent).toContain('Votre panier est vide');
    expect(cartText()).toContain('0,00 €');
  });

  /**
   * La remise vient du serveur (`discountPercent`), elle n'est pas codée ici :
   * c'est ce qui garantit qu'un changement de `PRE_ORDER_DISCOUNT_PERCENT` se
   * voit sans toucher au front.
   */
  it('applique la remise annoncée par l’API', async () => {
    await mount();
    // 2 hot-dogs à 3,50 € = 7,00 €, moins 10 %.
    await addTo('Hot-dog classique', 2);

    expect(cartText()).toContain('Sous-total7,00 €');
    expect(cartText()).toContain('−0,70 €');
    expect(cartText()).toContain('Total 6,30 €');
  });

  /**
   * La remise se calcule sur le sous-total, pas ligne par ligne : additionner
   * des arrondis séparés dérive de quelques centimes, et l'écart se voit.
   */
  it('arrondit la remise une seule fois, sur le total', async () => {
    await mount();
    // 3 × 2,50 € = 7,50 € → 10 % = 0,75 €, exact au centime.
    await addTo('Heineken 33cl', 3);

    expect(cartText()).toContain('−0,75 €');
    expect(cartText()).toContain('Total 6,75 €');
  });

  it('regroupe un même article sur une seule ligne', async () => {
    await mount();
    await addTo('Heineken 33cl', 3);

    const lines = host.querySelectorAll('#menu .lg\\:sticky li');
    expect(lines.length).toBe(1);
    expect(lines[0].textContent).toContain('×3');
  });

  it('retire la ligne quand la quantité retombe à zéro', async () => {
    await mount();
    await addTo('Heineken 33cl');

    host.querySelector<HTMLButtonElement>('button[aria-label="Retirer un Heineken 33cl"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.textContent).toContain('Votre panier est vide');
  });

  /**
   * Le délai vient de l'API : `PRE_ORDER_CLOSE_LEAD_HOURS` est réglable, et une
   * phrase figée dans le gabarit mentirait au premier changement.
   */
  it('annonce le délai de clôture donné par l’API', async () => {
    await mount();

    expect(host.textContent).toContain('Jusqu’à 12h avant');
  });

  it('groupe le menu par catégorie', async () => {
    await mount();

    const groups = [...host.querySelectorAll('#menu h3')].map((h) => h.textContent?.trim());
    expect(groups).toContain('Hot-dogs');
    expect(groups).toContain('Boissons');
  });

  const validateButton = (): HTMLButtonElement | undefined =>
    [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Valider ma précommande'),
    );

  /**
   * Le défaut visé : un bouton de validation inerte, ou envoyant vers une URL
   * que le serveur n'a pas fournie.
   */
  it('la validation ouvre le paiement Lydia et y redirige', async () => {
    await mount();
    await addTo('Hot-dog classique', 2);

    expect(validateButton()?.disabled).toBe(false);

    validateButton()?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const opened = http.expectOne((r) => r.url.endsWith('/account/pre-orders'));
    expect(opened.request.body).toEqual({
      eventId: 1,
      lines: [{ productId: 11, quantity: 2 }],
    });

    opened.flush({
      orderRef: 'ref-1',
      status: 'pending',
      amountCents: 630,
      mobileUrl: 'https://lydia.test/pay/ref-1',
      expiresAt: null,
    });
    await fixture.whenStable();

    expect(navigation.go).toHaveBeenCalledWith('https://lydia.test/pay/ref-1');
  });

  /**
   * Le défaut visé : laisser un visiteur déconnecté valider, pour qu'il se
   * heurte au 401 du serveur. Le menu reste consultable — c'est le panier qui
   * doit dire ce qui manque.
   */
  it('un visiteur déconnecté voit le menu mais qu’il faut se connecter', async () => {
    sessionStatus.set('anonymous');
    await mount();
    await addTo('Hot-dog classique');

    expect(host.textContent).toContain('Hot-dog classique');
    expect(cartText()).toContain('Connectez-vous');
    expect(validateButton()).toBeUndefined();
  });

  /**
   * Le défaut visé : ouvrir une demande de paiement à zéro euro.
   */
  it('la validation reste fermée tant que le panier est vide', async () => {
    await mount();

    expect(validateButton()?.disabled).toBe(true);
  });

  it('marque comme complète une soirée sans place restante', async () => {
    await mount();

    expect(host.textContent).toContain('Complet');
  });

  /** Le catalogue peut être vide hors saison : la page doit le dire, pas rester nue. */
  it('explique l’absence de soirée ouverte', async () => {
    await mount([]);

    expect(host.textContent).toContain('Aucune soirée n’est ouverte à la précommande');
  });
});
