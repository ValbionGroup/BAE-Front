import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { ProductionReturnModal } from './production-return-modal';
import { PrintService } from '#core/services/print/print-service';
import { ModalService } from '../modal.service';
import { findA11yViolations } from '@bae/ui/testing';

const baseUrl = 'http://api.test/v1';
const returnsUrl = `${baseUrl}/events/9/production-returns`;

/** Deux denrées prélevées, rien encore rendu. */
const RETURNABLE = [
  {
    goodId: 12,
    goodName: 'Saucisses',
    unit: 'pcs',
    takenQty: 12,
    returnedQty: 0,
    returnableQty: 12,
  },
  { goodId: 13, goodName: 'Pains', unit: 'pcs', takenQty: 8, returnedQty: 0, returnableQty: 8 },
];

describe(ProductionReturnModal.name, () => {
  let component: ProductionReturnModal;
  let fixture: ComponentFixture<ProductionReturnModal>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionReturnModal],
      providers: [
        { provide: API_BASE_URL, useValue: baseUrl },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductionReturnModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('eventId', '9');
    http = TestBed.inject(HttpTestingController);
    // Déclenche l'effet de chargement : les inputs viennent d'être posés.
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  /** Sert la liste du prélevé que l'ouverture demande. */
  async function loadReturnable(): Promise<void> {
    http.expectOne(returnsUrl).flush(RETURNABLE);
    await fixture.whenStable();
  }

  /**
   * Le défaut visé : lire `eventId()` à un moment où l'input n'est pas encore
   * posé. La modale n'émettait alors aucune requête et affichait son message
   * d'erreur, sans qu'aucun test ne s'en aperçoive.
   */
  it('loads what the event took out when it opens', async () => {
    await loadReturnable();

    expect(component['error']()).toBeNull();
    expect(component['lines']().map((line) => line.good.goodName)).toEqual(['Saucisses', 'Pains']);
  });

  /**
   * Le défaut visé : envoyer aussi les lignes mises au rebut. Le back crédite
   * tout ce qu'il reçoit — le stock jeté reviendrait donc en réserve, sans que
   * rien ne le signale.
   */
  it('sends nothing for a good sent to the bin', async () => {
    await loadReturnable();

    component['setQuantity'](12, '5');
    component['setDestination'](12, 'discard');

    const submitted = component['submit']();
    http.expectNone(returnsUrl);
    await submitted;
  });

  /**
   * Le défaut visé, distinct : laisser partir une quantité supérieure au
   * prélevé. Le back répond 400 `E_RETURN_EXCEEDS_PICKED` là où l'écran pouvait
   * le dire avant d'envoyer.
   */
  it('refuses to submit more than the event took out', async () => {
    await loadReturnable();
    const closeSpy = vi.spyOn(TestBed.inject(ModalService), 'close');

    component['setQuantity'](12, '13');

    const submitted = component['submit']();
    http.expectNone(returnsUrl);
    await submitted;

    expect(closeSpy).not.toHaveBeenCalled();
  });

  /**
   * Le défaut visé, distinct des précédents : fermer la modale sur un refus du
   * serveur, ce qui perdrait un comptage saisi denrée par denrée.
   */
  it('keeps the modal open when the server refuses the return', async () => {
    await loadReturnable();
    const closeSpy = vi.spyOn(TestBed.inject(ModalService), 'close');

    component['setQuantity'](12, '5');

    const submitted = component['submit']();
    const request = http.expectOne(returnsUrl);
    expect(request.request.body).toEqual({ lines: [{ goodId: 12, quantity: 5 }] });
    request.flush(
      { code: 'E_RETURN_EXCEEDS_PICKED', message: 'On ne peut pas remettre plus que le prélevé.' },
      { status: 400, statusText: 'Bad Request' },
    );
    await submitted;

    expect(closeSpy).not.toHaveBeenCalled();
    expect(component['error']()).toBeTruthy();
  });

  it('renders without accessibility violations', async () => {
    await loadReturnable();
    fixture.detectChanges();

    expect(await findA11yViolations(fixture.nativeElement)).toEqual([]);
  });

  it('prints the closing sheet', async () => {
    await loadReturnable();
    const printService = TestBed.inject(PrintService);
    const downloadSpy = vi.spyOn(printService, 'download').mockImplementation(() => {});

    component['printClosing']();

    expect(downloadSpy).toHaveBeenCalledWith(
      '/events/9/production-returns/pdf',
      expect.any(String),
    );
  });
});
