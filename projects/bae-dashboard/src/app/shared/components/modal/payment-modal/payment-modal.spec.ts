import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { PaymentModal, type PaymentMethod } from './payment-modal';
import { ModalService } from '../modal.service';
import { BarcodeScannerService } from '#core/services/barcode/barcode-scanner-service';

describe(PaymentModal.name, () => {
  let fixture: ComponentFixture<PaymentModal>;
  let paid: PaymentMethod[];

  beforeEach(async () => {
    paid = [];
    await TestBed.configureTestingModule({
      imports: [PaymentModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({
          initialState: {
            auth: {
              member: {
                id: 1,
                points: 0,
                firstName: 'A',
                lastName: 'B',
                role: 'x',
                phone: '0612345678',
              },
            },
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentModal);
    fixture.componentRef.setInput('id', 'm1');
    fixture.componentRef.setInput('totalCents', 1250);
    fixture.componentRef.setInput('onConfirm', (m: PaymentMethod) => void paid.push(m));
    fixture.detectChanges();
  });

  const text = () => fixture.nativeElement.textContent as string;
  const cash = () => {
    fixture.componentInstance['choose']('cash');
    fixture.detectChanges();
  };

  it('demande le montant remis avant d’encaisser en espèces', () => {
    expect(text()).not.toContain('Montant remis');
    cash();
    expect(text()).toContain('Montant remis');
    expect(paid).toEqual([]);
  });

  it('cumule les coupures tapées', () => {
    cash();
    fixture.componentInstance['addDenomination'](1000);
    fixture.componentInstance['addDenomination'](500);
    expect(fixture.componentInstance['givenCents']()).toBe(1500);
  });

  it('annonce le rendu', () => {
    cash();
    fixture.componentInstance['addDenomination'](2000);
    fixture.detectChanges();

    expect(fixture.componentInstance['changeCents']()).toBe(750);
    expect(text()).toContain('7,50');
  });

  /** `@if (x; as y)` traiterait 0 comme absent : le compte juste doit s'afficher. */
  it('affiche un rendu nul plutôt que de retomber sur l’invite', () => {
    cash();
    fixture.componentInstance['setExact']();
    fixture.detectChanges();

    expect(fixture.componentInstance['changeCents']()).toBe(0);
    expect(text()).toContain('À rendre');
    expect(text()).not.toContain('Saisissez ce que le client a donné');
  });

  it('refuse de valider tant que le compte n’y est pas', () => {
    cash();
    fixture.componentInstance['addDenomination'](1000);
    expect(fixture.componentInstance['canConfirmCash']()).toBe(false);

    fixture.componentInstance['addDenomination'](500);
    expect(fixture.componentInstance['canConfirmCash']()).toBe(true);
  });

  it('nomme ce qui manque', () => {
    cash();
    fixture.componentInstance['addDenomination'](1000);
    fixture.detectChanges();

    expect(text()).toContain('Montant insuffisant');
    expect(text()).toContain('2,50');
  });

  /**
   * Le défaut visé : refermer l'écran d'attente **avant** que le paiement ait
   * commencé.
   *
   * `cardPayment()` vaut `null` à deux moments opposés — « pas encore démarré »
   * et « conclu ». Les confondre faisait disparaître la modale à l'instant même
   * du clic, si bien que « Présentez la carte », puis « Vérifier l'état »,
   * n'étaient jamais visibles.
   */
  it('garde l’écran d’attente ouvert le temps que le terminal démarre', async () => {
    const modals = TestBed.inject(ModalService);
    const closed: string[] = [];
    modals.close = (id: string) => void closed.push(id);

    // Un `onConfirm` qui ne se résout jamais : le paiement est « en vol ».
    fixture.componentRef.setInput('onConfirm', () => new Promise<void>(() => {}));
    fixture.detectChanges();

    fixture.componentInstance['choose']('card');
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(closed).toEqual([]);
    expect(text()).toContain('Présentez la carte');
  });

  /**
   * Le défaut visé : un filet invisible. « Vérifier l'état » est le seul moyen
   * de conclure un paiement quand le webhook n'arrive pas — s'il ne s'affiche
   * jamais, une carte débitée reste sans commande.
   */
  it('propose de vérifier l’état après vingt secondes d’attente', async () => {
    vi.useFakeTimers();
    try {
      fixture.componentRef.setInput('onConfirm', () => new Promise<void>(() => {}));
      fixture.detectChanges();

      fixture.componentInstance['choose']('card');
      fixture.detectChanges();
      expect(text()).not.toContain('Vérifier l’état');

      vi.advanceTimersByTime(20_000);
      fixture.detectChanges();

      expect(fixture.componentInstance['canRecheck']()).toBe(true);
      expect(text()).toContain('Vérifier l’état');
    } finally {
      vi.useRealTimers();
    }
  });

  describe('Lydia', () => {
    function scanner(): BarcodeScannerService {
      return TestBed.inject(BarcodeScannerService);
    }

    function setMemberPhone(phone: string | null): void {
      TestBed.inject(MockStore).setState({
        auth: { member: { id: 1, points: 0, firstName: 'A', lastName: 'B', role: 'x', phone } },
      });
      fixture.detectChanges();
    }

    const lydiaButton = (): HTMLButtonElement | undefined =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
        (el) => el.textContent?.trim() === 'Lydia',
      ) as HTMLButtonElement | undefined;

    it('désactive le bouton Lydia quand le membre connecté n’a pas de téléphone', () => {
      setMemberPhone(null);
      expect(lydiaButton()?.disabled).toBe(true);
    });

    it('active le bouton Lydia quand le membre connecté a un téléphone', () => {
      setMemberPhone('0612345678');
      expect(lydiaButton()?.disabled).toBe(false);
    });

    it('scanne puis soumet automatiquement le contenu du QR', async () => {
      const calls: Array<[string, string | undefined]> = [];
      fixture.componentRef.setInput('onConfirm', (method: PaymentMethod, paymentData?: string) => {
        calls.push([method, paymentData]);
        return Promise.resolve(null);
      });
      fixture.detectChanges();
      vi.spyOn(scanner(), 'start').mockImplementation(async (_video, onCode) => {
        onCode('QR-BRUT-TEST');
        return true;
      });

      fixture.componentInstance['choose']('lydia');
      await fixture.whenStable();

      expect(calls).toEqual([['lydia', 'QR-BRUT-TEST']]);
    });

    it('referme la modale quand le paiement aboutit', async () => {
      const modals = TestBed.inject(ModalService);
      const closed: string[] = [];
      modals.close = (id: string) => void closed.push(id);

      fixture.componentRef.setInput('onConfirm', () => Promise.resolve(null));
      fixture.detectChanges();
      vi.spyOn(scanner(), 'start').mockImplementation(async (_video, onCode) => {
        onCode('QR-BRUT-TEST');
        return true;
      });

      fixture.componentInstance['choose']('lydia');
      await fixture.whenStable();

      expect(closed).toEqual(['m1']);
    });

    /**
     * Le défaut visé : renvoyer le caissier sur la page caisse pour rouvrir la
     * modale, alors que le client est encore là, QR en main.
     */
    it('garde la modale ouverte et propose de rescanner quand Lydia refuse', async () => {
      const modals = TestBed.inject(ModalService);
      const closed: string[] = [];
      modals.close = (id: string) => void closed.push(id);

      fixture.componentRef.setInput('onConfirm', () => Promise.resolve('QR expiré.'));
      fixture.detectChanges();
      vi.spyOn(scanner(), 'start').mockImplementation(async (_video, onCode) => {
        onCode('QR-BRUT-TEST');
        return true;
      });

      fixture.componentInstance['choose']('lydia');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(closed).toEqual([]);
      expect(text()).toContain('QR expiré.');
      expect(text()).toContain('Rescanner');
    });

    it('affiche un message si la caméra est indisponible', async () => {
      vi.spyOn(scanner(), 'start').mockResolvedValue(false);

      fixture.componentInstance['choose']('lydia');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(text()).toContain('Caméra indisponible');
    });
  });
});
