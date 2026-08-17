import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

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

describe('PrecommandesAdmin', () => {
  let list: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    list = vi.fn().mockReturnValue(of([ticket()]));

    await TestBed.configureTestingModule({
      imports: [PrecommandesAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PreOrdersService, useValue: { list, setStatus: vi.fn(), collect: vi.fn() } },
        {
          provide: EventsStore,
          useValue: {
            activeEvent: () => ({ id: '4', name: 'Soirée test' }),
            activeEventId: () => '4',
            load: () => Promise.resolve(),
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
        { provide: PreOrdersService, useValue: { list, setStatus: vi.fn(), collect: vi.fn() } },
        {
          provide: EventsStore,
          useValue: {
            activeEvent: () => null,
            activeEventId: () => null,
            load: () => Promise.resolve(),
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
});
