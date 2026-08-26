import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { findA11yViolations } from '@bae/ui/testing';

import { PrecommandesAdmin } from './precommandes-admin';
import { PreOrdersService } from '#core/services/pre-orders/pre-orders-service';
import { EventsStore } from '#core/store/events.store';
import type { PreOrderTicket } from '#core/models/pre-order.model';

function ticket(overrides: Partial<PreOrderTicket> = {}): PreOrderTicket {
  return {
    id: 1,
    reference: 'P-01',
    eventId: 4,
    status: 'pending',
    clientName: 'Camille Renard',
    lines: [{ productId: 7, productName: 'Hot-dog', quantity: 2, receivedQuantity: 0 }],
    paid: true,
    fullyCollected: false,
    pickupAt: '2026-08-16T19:30:00.000Z',
    due: false,
    createdAt: null,
    ...overrides,
  };
}

/** Ancrée sur l'heure pleine : chaque créneau se déduit d'un simple décalage. */
const EVENT_START = new Date('2026-08-16T19:00:00.000Z');

describe('PrecommandesAdmin', () => {
  let list: ReturnType<typeof vi.fn>;
  let setPickup: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    list = vi.fn().mockReturnValue(of([ticket()]));
    setPickup = vi
      .fn()
      .mockImplementation((id: number, pickupAt: string | null) => of(ticket({ id, pickupAt })));

    await TestBed.configureTestingModule({
      imports: [PrecommandesAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: PreOrdersService,
          useValue: { list, setStatus: vi.fn(), collect: vi.fn(), setPickup },
        },
        {
          provide: EventsStore,
          useValue: {
            activeEvent: () => ({
              id: '4',
              name: 'Soirée test',
              date: EVENT_START,
              // Secondes : c'est l'unité que le front écrit (`calcDuration`).
              duration: 4 * 60 * 60,
            }),
            activeEventId: () => '4',
            load: () => Promise.resolve(),
            refresh: () => Promise.resolve(),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('charge les précommandes de la soirée active', async () => {
    const fixture = TestBed.createComponent(PrecommandesAdmin);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(list).toHaveBeenCalledWith('4');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Camille Renard');
  });

  /**
   * Garde le choix du §0 nonies : plutôt un écran qui se tait qu'un chiffre
   * inventé. `PreOrderTicket` ne porte **aucun montant** — la précommande a été
   * payée un autre jour et ne compte pas dans la recette du soir.
   */
  it('n’affiche aucun montant, faute de donnée', async () => {
    const fixture = TestBed.createComponent(PrecommandesAdmin);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Total commande');
    expect(text).not.toContain('€');
  });

  it('dit quand aucune soirée n’est en cours plutôt que d’en inventer une', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PrecommandesAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: PreOrdersService,
          useValue: { list, setStatus: vi.fn(), collect: vi.fn(), setPickup },
        },
        {
          provide: EventsStore,
          useValue: {
            activeEvent: () => null,
            activeEventId: () => null,
            load: () => Promise.resolve(),
            refresh: () => Promise.resolve(),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PrecommandesAdmin);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aucune soirée en cours');
  });

  /**
   * L'ancien panneau de cette colonne était un faux scanner : une caméra
   * dessinée, un champ inerte et un encart admettant qu'il n'était « pas
   * branché ». Le retrait passe par la caisse, pas par cet écran.
   */
  describe('créneau de retrait', () => {
    async function render() {
      const fixture = TestBed.createComponent(PrecommandesAdmin);
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const row = [...host.querySelectorAll('button[aria-current], button')].find((el) =>
        el.textContent?.includes('Camille Renard'),
      ) as HTMLElement;
      row.click();
      fixture.detectChanges();

      return { fixture, host };
    }

    /**
     * Les libellés se lisent en heure **locale** : les affirmer en dur ferait
     * dépendre le test du fuseau de la machine qui l'exécute. On les recalcule
     * donc depuis la date de la soirée.
     */
    it('propose les créneaux de la soirée par quarts d’heure', async () => {
      const { host } = await render();

      const labels = [...host.querySelectorAll('[data-testid="pickup-slot"]')].map((b) =>
        b.textContent?.trim(),
      );

      const at = (minutes: number) =>
        new Date(EVENT_START.getTime() + minutes * 60_000).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });

      // Soirée de 4 h par pas de 15 min, bornes comprises.
      expect(labels).toHaveLength(17);
      expect(labels[0]).toBe(at(0));
      expect(labels[1]).toBe(at(15));
      expect(labels.at(-1)).toBe(at(240));
    });

    it('écrit le créneau choisi', async () => {
      const { host, fixture } = await render();

      const slots = [...host.querySelectorAll('[data-testid="pickup-slot"]')];
      (slots[2] as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(setPickup).toHaveBeenCalledTimes(1);
      const [id, iso] = setPickup.mock.calls[0];
      expect(id).toBe(1);
      // Troisième créneau : le début de la soirée plus 30 minutes.
      expect(new Date(iso as string).getTime()).toBe(EVENT_START.getTime() + 30 * 60_000);
    });

    /** Retirer le créneau n'est pas « ne rien changer » : c'est `null`, explicitement. */
    it('retire le créneau avec null', async () => {
      const { host, fixture } = await render();

      const remove = [...host.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Retirer le créneau'),
      ) as HTMLButtonElement;
      remove.click();
      await fixture.whenStable();

      expect(setPickup).toHaveBeenCalledWith(1, null);
    });

    /**
     * La file était une liste de `div` cliquables : inatteignable au clavier, et
     * muette pour un lecteur d'écran sur la commande ouverte.
     */
    it('rend la file parcourable au clavier', async () => {
      const { host } = await render();

      const row = [...host.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Camille Renard'),
      );

      expect(row).toBeDefined();
      expect(row?.tagName).toBe('BUTTON');
      expect(row?.getAttribute('aria-current')).toBe('true');
    });

    it('expose les créneaux sans violation d’accessibilité', async () => {
      const { host } = await render();

      expect(await findA11yViolations(host)).toEqual([]);
    });

    it('ne propose rien tant qu’aucune commande n’est choisie', async () => {
      const fixture = TestBed.createComponent(PrecommandesAdmin);
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelectorAll('[data-testid="pickup-slot"]')).toHaveLength(0);
      expect(host.textContent).toContain('Aucune commande sélectionnée');
    });
  });
});
