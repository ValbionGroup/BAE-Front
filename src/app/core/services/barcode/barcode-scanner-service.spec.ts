import { TestBed } from '@angular/core/testing';

import { BarcodeScannerService, SCAN_COOLDOWN_MS } from './barcode-scanner-service';

describe(BarcodeScannerService.name, () => {
  let service: BarcodeScannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BarcodeScannerService);
  });

  it('accepts a code the first time it is read', () => {
    expect(service.accepts('3268754117904', 1000)).toBe(true);
  });

  it('absorbs the same code re-read within the cooldown', () => {
    service.accepts('3268754117904', 1000);

    // Le décodage tourne à la fréquence d'affichage : un paquet tenu devant
    // l'objectif est relu des dizaines de fois, et chaque relecture ajouterait
    // une unité en stock.
    expect(service.accepts('3268754117904', 1016)).toBe(false);
    expect(service.accepts('3268754117904', 1000 + SCAN_COOLDOWN_MS - 1)).toBe(false);
  });

  it('accepts the same code again once the cooldown has passed', () => {
    service.accepts('3268754117904', 1000);

    // Scanner deux fois le même produit est un geste légitime — c'est ainsi
    // qu'on compte six briques de lait identiques.
    expect(service.accepts('3268754117904', 1000 + SCAN_COOLDOWN_MS)).toBe(true);
  });

  it('does not make one code wait for another', () => {
    service.accepts('3268754117904', 1000);

    // Le délai est par code : viser deux produits différents à la suite doit
    // les enregistrer tous les deux, sans attendre.
    expect(service.accepts('3168421988011', 1010)).toBe(true);
  });

  it('forgets previous reads when the camera stops', () => {
    service.accepts('3268754117904', 1000);
    service.stop();

    // Revenir sur l'écran ne doit pas faire ignorer le premier scan : le
    // service est `providedIn: 'root'`, il survit à la page.
    expect(service.accepts('3268754117904', 1010)).toBe(true);
  });
});
