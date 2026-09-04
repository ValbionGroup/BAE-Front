import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { Paiements } from './paiements';
import type { ApiPayment } from '#core/services/payments/payments-service';
import type { ApiTransaction } from '#core/services/transactions/transactions-service';

const baseUrl = 'http://api.test/v1';

const PRE_ORDER_TRANSACTION: ApiTransaction = {
  id: 9,
  type: 'lydia',
  amount: 1500,
  eventId: 3,
  orderIds: [],
  nature: 'pre_order',
  label: 'Pack solo',
  itemCount: 2,
  payer: 'Camille Renard',
  createdAt: '2026-08-18T19:30:00.000Z',
};

const COUNTER_TRANSACTION: ApiTransaction = {
  id: 10,
  type: 'cash',
  amount: 500,
  eventId: 3,
  orderIds: [42],
  nature: 'order',
  label: 'Soirée Hivernale',
  itemCount: 1,
  payer: null,
  createdAt: '2026-08-18T19:35:00.000Z',
};

const PENDING_PAYMENT: ApiPayment = {
  id: 2,
  orderRef: 'ref-2',
  status: 'pending',
  kind: 'pre_order',
  provider: 'lydia',
  amountCents: 800,
  providerReference: null,
  transactionIdentifier: null,
  transactionId: null,
  paidAt: null,
  expiresAt: '2026-08-18T20:00:00.000Z',
  createdAt: '2026-08-18T19:45:00.000Z',
  payerName: 'Léo Dubois',
  payerEmail: 'l.dubois@etu.ec.fr',
};

const SETTLED_PAYMENT: ApiPayment = {
  id: 1,
  orderRef: 'ref-1',
  status: 'paid',
  kind: 'pre_order',
  provider: 'lydia',
  amountCents: 1500,
  providerReference: 'lydia-uuid-1',
  transactionIdentifier: 'tx-1',
  transactionId: 9,
  paidAt: '2026-08-18T19:30:00.000Z',
  expiresAt: null,
  createdAt: '2026-08-18T19:15:00.000Z',
  payerName: 'Camille Renard',
  payerEmail: 'c.renard@etu.ec.fr',
};

async function mount(
  http: HttpTestingController,
  transactions: readonly ApiTransaction[],
  payments: readonly ApiPayment[],
): Promise<ComponentFixture<Paiements>> {
  const fixture = TestBed.createComponent(Paiements);
  fixture.detectChanges();

  http.expectOne(`${baseUrl}/payments`).flush(payments);
  for (const request of http.match((r) => r.url === `${baseUrl}/transactions`)) {
    request.flush(transactions);
  }
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture;
}

async function render(
  http: HttpTestingController,
  transactions: readonly ApiTransaction[],
  payments: readonly ApiPayment[],
): Promise<HTMLElement> {
  return (await mount(http, transactions, payments)).nativeElement as HTMLElement;
}

function ledgerTitles(host: HTMLElement): string[] {
  return [...host.querySelectorAll('[data-ledger-title]')].map(
    (node) => node.textContent?.trim() ?? '',
  );
}

function kpis(host: HTMLElement): Record<string, string> {
  const entries = [...host.querySelectorAll('dl > div')].map((card) => [
    card.querySelector('dt')?.textContent?.trim() ?? '',
    card.querySelector('dd')?.textContent?.trim() ?? '',
  ]);
  return Object.fromEntries(entries);
}

describe(Paiements.name, () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Paiements],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  /**
   * Le défaut visé : la ligne d'une précommande ne disait ni qui avait payé ni
   * ce qui avait été acheté — `preload('orders')` la laissait à « 0 commande ».
   */
  it('names the payer and the article count of a pre-order transaction', async () => {
    const text = (await render(http, [PRE_ORDER_TRANSACTION], [SETTLED_PAYMENT])).textContent ?? '';

    expect(text).toContain('Camille Renard');
    expect(text).toContain('2 articles');
    expect(text).toContain('Pack solo');
    expect(text).toContain('15,00 €');
  });

  /**
   * Le défaut visé : les deux tables affichaient le même argent. Un paiement
   * abouti a déjà créé sa transaction (`payment_service.ts`), donc seule la
   * demande qui n'a jamais abouti apporte une information neuve.
   */
  it('lists an unsettled payment request without repeating a settled one', async () => {
    const text =
      (await render(http, [PRE_ORDER_TRANSACTION], [SETTLED_PAYMENT, PENDING_PAYMENT]))
        .textContent ?? '';

    expect(text).toContain('Léo Dubois');
    expect(text).toContain('8,00 €');
    expect(text.match(/Camille Renard/g)).toHaveLength(1);
    expect(text).not.toContain('lydia-uuid-1');
  });

  /**
   * Le défaut visé : des KPI par moyen de paiement, alors que la question du
   * trésorier est « combien est entré tout seul, combien est passé par nous ».
   * Le canal se déduit du join `payments.transactionId`, pas de `type`.
   */
  it('splits the takings between online and counter channels', async () => {
    const host = await render(
      http,
      [PRE_ORDER_TRANSACTION, COUNTER_TRANSACTION],
      [SETTLED_PAYMENT, PENDING_PAYMENT],
    );

    expect(kpis(host)).toMatchObject({
      Encaissé: '20,00 €',
      'En ligne': '15,00 €',
      'Au comptoir': '5,00 €',
      'En attente': '8,00 €',
    });
  });

  /**
   * Le défaut visé : une soirée produit des centaines de lignes et la page n'en
   * offrait aucune prise. La recherche porte sur ce qu'on lit — l'intitulé, le
   * payeur, la référence.
   */
  it('narrows the ledger to rows matching the search query', async () => {
    const fixture = await mount(
      http,
      [PRE_ORDER_TRANSACTION, COUNTER_TRANSACTION],
      [SETTLED_PAYMENT],
    );
    const host = fixture.nativeElement as HTMLElement;
    expect(ledgerTitles(host)).toHaveLength(2);

    const search = host.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'camille';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(ledgerTitles(host)).toEqual(['Précommande · Pack solo']);
  });

  /**
   * Le défaut visé, distinct de la recherche : trier par nature est le geste
   * courant du trésorier (« montre-moi les précommandes »), et il ne se tape
   * pas au clavier.
   */
  it('keeps only the chosen nature when a filter tab is pressed', async () => {
    const fixture = await mount(
      http,
      [PRE_ORDER_TRANSACTION, COUNTER_TRANSACTION],
      [SETTLED_PAYMENT],
    );
    const host = fixture.nativeElement as HTMLElement;

    const tab = [...host.querySelectorAll<HTMLButtonElement>('[data-nature-tab]')].find(
      (button) => button.textContent?.trim().startsWith('Caisse') === true,
    );
    tab?.click();
    fixture.detectChanges();

    expect(ledgerTitles(host)).toEqual(['Caisse · Soirée Hivernale']);
    expect(tab?.getAttribute('aria-pressed')).toBe('true');
  });

  /**
   * Le défaut visé : une soirée chargée rendait des centaines de lignes d'un
   * coup. Le reste reste atteignable — un encaissement caché serait pire qu'une
   * liste longue.
   */
  it('caps the rendered ledger and reveals the rest on demand', async () => {
    const many = Array.from({ length: 60 }, (_, index) => ({
      ...COUNTER_TRANSACTION,
      id: 100 + index,
    }));
    const fixture = await mount(http, many, []);
    const host = fixture.nativeElement as HTMLElement;

    expect(ledgerTitles(host)).toHaveLength(50);

    const more = host.querySelector('[data-show-more]') as HTMLButtonElement;
    expect(more.textContent).toContain('10');

    more.click();
    fixture.detectChanges();

    expect(ledgerTitles(host)).toHaveLength(60);
    expect(host.querySelector('[data-show-more]')).toBeNull();
  });
});
