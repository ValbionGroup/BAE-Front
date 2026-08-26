import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { Paiements } from './paiements';
import type { ApiPayment } from '#core/services/payments/payments-service';

const baseUrl = 'http://api.test/v1';

const PAYMENTS: ApiPayment[] = [
  {
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
  },
];

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
   * Les deux tables de cette page parlent enfin la même unité : depuis le
   * 2026-08-25, `transactions.amount` et `payments.amount_cents` sont tous deux
   * des centimes. Les afficher bruts donnerait « 1500 € » pour quinze euros.
   */
  it('renders payment amounts in euros, not raw cents', async () => {
    const fixture = TestBed.createComponent(Paiements);
    fixture.detectChanges();

    http.expectOne(`${baseUrl}/payments`).flush(PAYMENTS);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('15,00 €');
    expect(text).toContain('lydia-uuid-1');
  });
});
