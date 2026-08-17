import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { VoucherCreateModal } from './voucher-create-modal';
import { LogistiqueStore } from '#core/store/logistique.store';
import { ModalService } from '../modal.service';
import { API_BASE_URL } from '#core/tokens/api-url.token';

const baseUrl = 'http://api.test/v1';

describe(VoucherCreateModal.name, () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VoucherCreateModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Charge le store pour que le sélecteur d'enseigne soit peuplé. */
  async function loadStore(): Promise<void> {
    const store = TestBed.inject(LogistiqueStore);
    const loading = store.load();
    http.expectOne(`${baseUrl}/goods`).flush([]);
    http.expectOne(`${baseUrl}/vouchers`).flush([]);
    http.expectOne(`${baseUrl}/suppliers`).flush([{ id: 3, name: 'Leclerc' }]);
    await loading;
  }

  it('sends the typed payload and closes on success', async () => {
    await loadStore();
    const closed = vi.spyOn(TestBed.inject(ModalService), 'close');

    const fixture = TestBed.createComponent(VoucherCreateModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.detectChanges();

    const modal = fixture.componentInstance as unknown as {
      onSupplierId(v: string): void;
      onValue(v: string): void;
      onExpiresAt(v: string): void;
      onCondition(v: string): void;
      submit(): Promise<void>;
    };
    modal.onSupplierId('3');
    modal.onValue('25,5');
    modal.onExpiresAt('2026-12-31');
    modal.onCondition('à partir de 80 €');

    const submitted = modal.submit();
    const req = http.expectOne(`${baseUrl}/vouchers`);
    // La virgule décimale saisie doit repartir en nombre.
    expect(req.request.body).toEqual({
      supplierId: 3,
      value: 25.5,
      expiresAt: '2026-12-31',
      condition: 'à partir de 80 €',
    });
    req.flush({
      id: 9,
      supplierId: 3,
      supplier: { id: 3, name: 'Leclerc' },
      value: 25.5,
      expiresAt: '2026-12-31',
      condition: 'à partir de 80 €',
      usedAt: null,
      used: false,
      daysUntilExpiry: 100,
      expired: false,
      warn: false,
    });
    await submitted;

    expect(closed).toHaveBeenCalledWith('modal-1');
  });

  it('stays open and keeps every field when the API refuses', async () => {
    await loadStore();
    const closed = vi.spyOn(TestBed.inject(ModalService), 'close');

    const fixture = TestBed.createComponent(VoucherCreateModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.detectChanges();

    const modal = fixture.componentInstance as unknown as {
      onSupplierId(v: string): void;
      onValue(v: string): void;
      onExpiresAt(v: string): void;
      submit(): Promise<void>;
      value(): string;
    };
    modal.onSupplierId('3');
    modal.onValue('25,5');
    modal.onExpiresAt('2026-12-31');

    const submitted = modal.submit();
    http
      .expectOne(`${baseUrl}/vouchers`)
      .flush({ message: 'Valeur invalide.' }, { status: 422, statusText: 'x' });
    await submitted;

    expect(closed).not.toHaveBeenCalled();
    // Refaire saisir quatre champs après un 422 fait abandonner l'utilisateur.
    expect(modal.value()).toBe('25,5');
    expect(TestBed.inject(LogistiqueStore).createError()).toBe('Valeur invalide.');
  });

  it('refuses to submit without a supplier or a date', async () => {
    await loadStore();

    const fixture = TestBed.createComponent(VoucherCreateModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.detectChanges();

    const modal = fixture.componentInstance as unknown as {
      onValue(v: string): void;
      submit(): Promise<void>;
    };
    modal.onValue('25');

    await modal.submit();

    // Assertion explicite plutôt que de s'en remettre au `http.verify()` de
    // l'afterEach : un test dont la réussite tient à un hook qu'on ne voit pas
    // se lit comme un test qui n'assertionne rien.
    http.expectNone(`${baseUrl}/vouchers`);
  });
});
