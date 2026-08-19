import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Paiement } from './paiement';
import type { PaymentStatus } from '../../core/payments.service';

describe(Paiement.name, () => {
  let fixture: ComponentFixture<Paiement>;
  let host: HTMLElement;
  let http: HttpTestingController;

  /**
   * Les faux timers ne sont armés qu'**après** la compilation : `compileComponents`
   * s'appuie sur de vraies échéances, et les figer plus tôt fait pendre le montage.
   */
  const mount = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [Paiement],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Paiement);
    fixture.componentRef.setInput('orderRef', 'ref-1');
    http = TestBed.inject(HttpTestingController);
    host = fixture.nativeElement as HTMLElement;

    vi.useFakeTimers();
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
  };

  /** Répond à l'interrogation en attente, s'il y en a une. */
  const respond = (status: PaymentStatus): boolean => {
    const pending = http.match((r) => r.url.endsWith('/account/payments/ref-1'));
    if (pending.length === 0) return false;

    pending[0].flush({
      orderRef: 'ref-1',
      status,
      amountCents: 1500,
      mobileUrl: null,
      expiresAt: null,
    });
    fixture.detectChanges();
    return true;
  };

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  /**
   * Le défaut visé : attendre le premier intervalle avant de lire l'état. Le
   * webhook a presque toujours abouti quand le navigateur atterrit — différer
   * la première lecture ajoute une attente à un paiement déjà confirmé.
   */
  it('lit l’état dès le chargement, sans attendre', async () => {
    await mount();

    expect(respond('paid')).toBe(true);
    expect(host.textContent).toContain('Paiement confirmé');
  });

  it('annonce l’attente puis bascule quand la confirmation arrive', async () => {
    await mount();

    respond('pending');
    expect(host.textContent).toContain('Confirmation en cours');

    vi.advanceTimersByTime(500);
    respond('paid');
    expect(host.textContent).toContain('Paiement confirmé');
  });

  /**
   * Le défaut visé : une page qui interroge indéfiniment, laissant l'utilisateur
   * devant un sablier sans jamais lui dire quoi faire.
   */
  it('cesse d’interroger au bout de trente secondes et oriente ailleurs', async () => {
    await mount();

    // On épuise le calendrier : chaque réponse « pending » arme la suivante.
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (!respond('pending')) break;
      vi.advanceTimersByTime(2000);
    }

    fixture.detectChanges();
    expect(host.textContent).toContain('Confirmation en attente');
    expect(host.textContent).not.toContain('Confirmation en cours');
  });

  /**
   * Le défaut visé : présenter un refus comme une attente. L'utilisateur
   * resterait devant un écran qui ne changera plus.
   */
  it('annonce un refus sans continuer d’interroger', async () => {
    await mount();

    respond('refused');
    vi.advanceTimersByTime(5000);

    expect(host.textContent).toContain('Paiement refusé');
    expect(respond('paid')).toBe(false);
  });
});
