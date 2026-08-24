import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { findA11yViolations } from '@bae/ui/testing';

import { SubscriptionCreateModal } from './subscription-create-modal';
import { ModalService } from '../modal.service';
import type { ClientRow } from '#pages/authed/adherents/adherents.types';

const baseUrl = 'http://api.test/v1';

const CLIENT: ClientRow = {
  id: 7,
  membershipNumber: 'ADH-2025-0007',
  name: 'Camille Renard',
  email: 'c.renard@etu.ec.fr',
  promotion: '2A · Alt.',
  status: 'expired',
  expiresAt: '2025-08-31',
  daysUntilExpiry: -12,
};

/** Servi dans le désordre exprès : `GET /fast-passes` n'ordonne rien. */
const PLANS = [
  { id: 2, label: 'Scolarité', description: null, duration: 3, price: 35 },
  { id: 1, label: 'Annuelle', description: null, duration: 1, price: 15 },
];

describe(SubscriptionCreateModal.name, () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SubscriptionCreateModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(
    onSaved: () => void = () => {},
  ): Promise<ComponentFixture<SubscriptionCreateModal>> {
    const fixture = TestBed.createComponent(SubscriptionCreateModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.componentRef.setInput('client', CLIENT);
    fixture.componentRef.setInput('onSaved', onSaved);
    fixture.detectChanges();
    http.expectOne(`${baseUrl}/fast-passes`).flush(PLANS);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function selectAt(fixture: ComponentFixture<SubscriptionCreateModal>, index: number) {
    return (fixture.nativeElement as HTMLElement).querySelectorAll('select')[index];
  }

  function pick(select: HTMLSelectElement, value: string): void {
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  function submit(fixture: ComponentFixture<SubscriptionCreateModal>): void {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Enregistrer'))!.click();
  }

  async function flushReload(fixture: ComponentFixture<SubscriptionCreateModal>): Promise<void> {
    await fixture.whenStable();
    http.expectOne(`${baseUrl}/clients`).flush([]);
    http.expectOne(`${baseUrl}/clients/summary`).flush({
      total: 0,
      upToDate: 0,
      expired: 0,
      withoutSubscription: 0,
      expiringSoon: 0,
    });
    await fixture.whenStable();
    await fixture.whenStable();
  }

  it('lists the plans shortest first, with their duration in years', async () => {
    const fixture = await render();
    const labels = Array.from(selectAt(fixture, 0).querySelectorAll('option')).map((option) =>
      option.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(labels).toEqual(['Choisir une formule…', 'Annuelle · 1 an', 'Scolarité · 3 ans']);
  });

  /**
   * La date de souscription est un `YYYY-MM-DD` sorti d'un `<input type=date>` :
   * lue par `new Date`, elle part en UTC pour revenir en heure locale, et
   * l'échéance annoncée recule d'un jour à l'ouest de Greenwich.
   *
   * ⚠️ Ne mord qu'à l'ouest de Greenwich.
   */
  it('announces the exact day the backend will compute', async () => {
    const fixture = await render();
    pick(selectAt(fixture, 0), '1');
    const date = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="date"]',
    )!;
    date.value = '2026-01-12';
    date.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('12 janv. 2027');
  });

  it('announces the expiry the backend will compute', async () => {
    const fixture = await render();
    pick(selectAt(fixture, 0), '1');
    fixture.detectChanges();

    const expected = new Date();
    expected.setFullYear(expected.getFullYear() + 1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(String(expected.getFullYear()));
  });

  // Une cotisation offerte n'est pas une cotisation à 0 € : pas de transaction.
  it('sends no payment at all when none was chosen', async () => {
    const fixture = await render();
    pick(selectAt(fixture, 0), '1');
    fixture.detectChanges();

    submit(fixture);
    const request = http.expectOne(`${baseUrl}/subscriptions`);
    expect(request.request.body.payment).toBeUndefined();
    expect(request.request.body.userId).toBe(7);
    expect(request.request.body.fastPassId).toBe(1);

    request.flush({});
    await flushReload(fixture);
  });

  it('prefills the amount from the plan and reads the French decimal comma', async () => {
    const fixture = await render();
    pick(selectAt(fixture, 0), '1');
    fixture.detectChanges();
    pick(selectAt(fixture, 1), 'cash');
    fixture.detectChanges();

    const amount = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    expect(amount.value).toBe('15,00');

    amount.value = '12,50';
    amount.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    submit(fixture);
    const request = http.expectOne(`${baseUrl}/subscriptions`);
    expect(request.request.body.payment).toEqual({ amount: 12.5, type: 'cash' });

    request.flush({});
    await flushReload(fixture);
  });

  // Clé primaire `(user_id, fast_pass_id, subscribed_at)` : un rejeu est un 409.
  it('shows the API refusal instead of closing', async () => {
    const fixture = await render();
    pick(selectAt(fixture, 0), '1');
    fixture.detectChanges();

    submit(fixture);
    http
      .expectOne(`${baseUrl}/subscriptions`)
      .flush(
        { message: 'Cette cotisation est déjà enregistrée à cette date.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Cette cotisation est déjà enregistrée à cette date.');
    expect(TestBed.inject(ModalService).modals().length).toBe(0);
  });

  it('refuses to submit without a plan, and says which fields are missing', async () => {
    const fixture = await render();

    submit(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('La formule, la date');
  });

  it('has no accessibility violation', async () => {
    const fixture = await render();
    expect(await findA11yViolations(fixture.nativeElement)).toEqual([]);
  });
});
