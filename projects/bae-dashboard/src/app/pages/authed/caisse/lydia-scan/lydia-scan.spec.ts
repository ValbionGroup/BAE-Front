import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LydiaScan } from './lydia-scan';
import { BarcodeScannerService } from '#core/services/barcode/barcode-scanner-service';

describe(LydiaScan.name, () => {
  let fixture: ComponentFixture<LydiaScan>;

  function scanner(): BarcodeScannerService {
    return TestBed.inject(BarcodeScannerService);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LydiaScan] }).compileComponents();
  });

  /** Le scan démarre au montage : le caissier a déjà choisi Lydia. */
  async function render(onCode?: (code: string) => void): Promise<void> {
    vi.spyOn(scanner(), 'start').mockImplementation(async (_video, emit) => {
      onCode?.('QR-BRUT-TEST');
      if (onCode) emit('QR-BRUT-TEST');
      return true;
    });

    fixture = TestBed.createComponent(LydiaScan);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('émet le contenu brut du QR dès qu’il est lu', async () => {
    const scanned: string[] = [];
    fixture = TestBed.createComponent(LydiaScan);
    fixture.componentInstance.scanned.subscribe((code) => scanned.push(code));

    vi.spyOn(scanner(), 'start').mockImplementation(async (_video, emit) => {
      emit('QR-BRUT-TEST');
      return true;
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(scanned).toEqual(['QR-BRUT-TEST']);
  });

  /**
   * Le défaut visé : un écran figé sur l'aperçu caméra pendant l'aller-retour
   * avec Lydia — le caissier ne sait pas si son scan a été pris en compte.
   */
  it('montre l’attente pendant que Lydia répond', async () => {
    await render();
    expect(text()).toContain('Présentez le QR Lydia');

    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    expect(text()).toContain('Paiement en cours');
    expect(text()).not.toContain('Présentez le QR Lydia');
  });

  it('annonce une caméra indisponible plutôt qu’un écran noir muet', async () => {
    vi.spyOn(scanner(), 'start').mockResolvedValue(false);

    fixture = TestBed.createComponent(LydiaScan);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('Caméra indisponible');
  });

  it('coupe la caméra en quittant', async () => {
    await render();
    const stop = vi.spyOn(scanner(), 'stop');

    fixture.destroy();

    expect(stop).toHaveBeenCalled();
  });
});
