import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { findA11yViolations } from '@bae/ui/testing';

import { ClientEditModal } from './client-edit-modal';
import { ModalService } from '../modal.service';
import type { ClientDetail } from '#pages/authed/adherents/adherents.types';

const baseUrl = 'http://api.test/v1';

const CLIENT: ClientDetail = {
  id: 7,
  membershipNumber: 'ADH-2025-0007',
  name: 'Camille Renard',
  email: 'c.renard@etu.ec.fr',
  promotion: '2A · Alt.',
  status: 'active',
  expiresAt: '2026-08-31',
  daysUntilExpiry: 40,
  school: 'ENSEIRB-MATMECA',
  phone: '06 24 31 88 02',
  registeredAt: '2025-09-12',
  note: 'Allergie noix.',
  noteAuthor: 'Sarah K.',
  noteWrittenAt: '2026-01-12T10:00:00.000Z',
  preparationNote: null,
  subscriptions: [],
  preOrderCount: 0,
  spentCents: 0,
};

describe(ClientEditModal.name, () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ClientEditModal],
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
  ): Promise<ComponentFixture<ClientEditModal>> {
    const fixture = TestBed.createComponent(ClientEditModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.componentRef.setInput('client', CLIENT);
    fixture.componentRef.setInput('onSaved', onSaved);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  /** Le rechargement n'est émis qu'au tour suivant : attendre avant de servir. */
  async function flushReload(fixture: ComponentFixture<ClientEditModal>): Promise<void> {
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
  }

  function submit(fixture: ComponentFixture<ClientEditModal>): void {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Enregistrer'))!.click();
  }

  it('prefills both fields from the client it was given', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector<HTMLInputElement>('input[type="tel"]')?.value).toBe('06 24 31 88 02');
    expect(el.querySelector('textarea')?.value).toBe('Allergie noix.');
  });

  // Le back refuse promotion et école : le prochain login SSO les réécrirait.
  it('offers no field the backend would silently drop', async () => {
    const fixture = await render();
    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('span')).map(
      (span) => span.textContent?.trim(),
    );

    expect(labels).toContain('Téléphone');
    expect(labels).not.toContain('Promotion');
    expect(labels).not.toContain('École');
  });

  it('sends null, not an empty string, for a cleared field', async () => {
    const fixture = await render();
    const textarea = (fixture.nativeElement as HTMLElement).querySelector('textarea')!;
    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    submit(fixture);
    const request = http.expectOne(`${baseUrl}/clients/7`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ phone: '06 24 31 88 02', note: null });

    request.flush({ ...CLIENT, note: null });
    await flushReload(fixture);
  });

  it('tells the page to re-read the detail once the write went through', async () => {
    let saved = 0;
    const fixture = await render(() => (saved += 1));

    submit(fixture);
    http.expectOne(`${baseUrl}/clients/7`).flush(CLIENT);
    await flushReload(fixture);
    await fixture.whenStable();

    expect(saved).toBe(1);
    expect(TestBed.inject(ModalService).modals().length).toBe(0);
  });

  it('keeps the modal open and shows the API message on a refusal', async () => {
    const fixture = await render();

    submit(fixture);
    http
      .expectOne(`${baseUrl}/clients/7`)
      .flush({ message: 'Numéro de téléphone invalide.' }, { status: 422, statusText: 'Unpro' });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Numéro de téléphone invalide.');
    expect((fixture.nativeElement as HTMLElement).querySelector('textarea')).not.toBeNull();
  });

  it('has no accessibility violation', async () => {
    const fixture = await render();
    expect(await findA11yViolations(fixture.nativeElement)).toEqual([]);
  });
});
