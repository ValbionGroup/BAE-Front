import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { VoucherEditModal } from './voucher-edit-modal';
import { LogistiqueStore } from '#core/store/logistique.store';
import { ModalService } from '../modal.service';
import { API_BASE_URL } from '@bae/ui';

const baseUrl = 'http://api.test/v1';

describe(VoucherEditModal.name, () => {
  let fixture: ComponentFixture<VoucherEditModal>;
  let http: HttpTestingController;
  let store: InstanceType<typeof LogistiqueStore>;

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [VoucherEditModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();

    store = TestBed.inject(LogistiqueStore);
    http = TestBed.inject(HttpTestingController);

    // Peuple le store comme le ferait la page Logistique avant d'ouvrir la modale.
    const loading = store.load();
    http
      .expectOne((r) => r.url.endsWith('/vouchers'))
      .flush([
        {
          id: 1,
          supplierId: 3,
          supplier: { id: 3, name: 'Leclerc' },
          value: 50,
          expiresAt: '2026-12-31',
          condition: 'à partir de 80 €',
          usedAt: null,
          used: false,
          daysUntilExpiry: 148,
          expired: false,
          warn: false,
        },
      ]);
    http
      .expectOne((r) => r.url.endsWith('/suppliers'))
      .flush([
        { id: 3, name: 'Leclerc' },
        { id: 4, name: 'Auchan' },
      ]);
    await loading;

    fixture = TestBed.createComponent(VoucherEditModal);
    fixture.componentRef.setInput('id', 'm1');
    fixture.componentRef.setInput('voucherId', 1);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('should create, prefilled from the store', async () => {
    await setup();
    expect(fixture.componentInstance).toBeTruthy();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('3');
    const inputs = fixture.nativeElement.querySelectorAll('input');
    expect((inputs[0] as HTMLInputElement).value).toBe('50,00');
    expect((inputs[1] as HTMLInputElement).value).toBe('2026-12-31');
    expect((inputs[2] as HTMLInputElement).value).toBe('à partir de 80 €');
  });

  it('sends only what changed, closes on success', async () => {
    await setup();
    const closed = vi.spyOn(TestBed.inject(ModalService), 'close');

    const valueInput = fixture.nativeElement.querySelectorAll('input')[0] as HTMLInputElement;
    valueInput.value = '80';
    valueInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLButtonElement).textContent?.includes('Enregistrer'),
    ) as HTMLButtonElement;
    button.click();

    const req = http.expectOne(`${baseUrl}/vouchers/1`);
    expect(req.request.body).toEqual({
      supplierId: 3,
      value: 80,
      expiresAt: '2026-12-31',
      condition: 'à partir de 80 €',
    });
    req.flush({
      id: 1,
      supplierId: 3,
      supplier: { id: 3, name: 'Leclerc' },
      value: 80,
      expiresAt: '2026-12-31',
      condition: 'à partir de 80 €',
      usedAt: null,
      used: false,
      daysUntilExpiry: 148,
      expired: false,
      warn: false,
    });
    await fixture.whenStable();

    expect(closed).toHaveBeenCalledWith('m1');
  });

  it('keeps the modal open and shows the API message on refusal', async () => {
    await setup();

    const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLButtonElement).textContent?.includes('Enregistrer'),
    ) as HTMLButtonElement;
    button.click();

    http
      .expectOne(`${baseUrl}/vouchers/1`)
      .flush({ message: 'Valeur invalide.' }, { status: 422, statusText: 'x' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Valeur invalide.');
  });
});
