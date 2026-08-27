import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Faq } from './faq';

describe(Faq.name, () => {
  let fixture: ComponentFixture<Faq>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Faq] }).compileComponents();
    fixture = TestBed.createComponent(Faq);
    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('rend les trois groupes de la maquette', () => {
    const headings = [...host.querySelectorAll('h2')].map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Précommandes', 'FastPass', 'Compte & adhésion']);
  });

  it('replie chaque réponse dans un `details` fermé par défaut', () => {
    const entries = host.querySelectorAll('details');

    expect(entries.length).toBe(10);
    expect([...entries].every((entry) => !entry.open)).toBe(true);
  });

  /**
   * `list-none` retire la puce native de `summary` : sans le chevron ajouté à la
   * place, rien n'indique plus que la ligne s'ouvre.
   */
  it('donne un indicateur visible à chaque question', () => {
    const summary = host.querySelector('summary');
    expect(summary?.querySelector('svg')).not.toBeNull();
  });

  /**
   * La maquette parle du « compte Bordeaux INP » ; le reste du dépôt, du back au
   * bouton de connexion, dit EirbConnect. Deux noms pour la même porte perdraient
   * l'utilisateur au moment précis où il cherche à entrer.
   */
  it('nomme le SSO comme le fait le bouton de connexion', () => {
    expect(host.textContent).toContain('EirbConnect');
    expect(host.textContent).not.toContain('Bordeaux INP');
  });
});
