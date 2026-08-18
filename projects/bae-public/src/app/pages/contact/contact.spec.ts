import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contact } from './contact';

describe(Contact.name, () => {
  let fixture: ComponentFixture<Contact>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Contact] }).compileComponents();
    fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('affiche les trois canaux de contact', () => {
    expect(host.textContent).toContain('bureau.alternants@enseirb-matmeca.fr');
    expect(host.textContent).toContain('Permanence');
    expect(host.textContent).toContain('tresorerie.bae@enseirb-matmeca.fr');
  });

  /**
   * Le formulaire n'est branché sur rien. Le laisser actif produirait un envoi
   * silencieusement perdu — pire qu'un champ grisé, puisque l'utilisateur
   * croirait avoir écrit au BAE.
   */
  it('grise le formulaire tant qu’il n’est branché sur rien', () => {
    const submit = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Envoyer le message'),
    );

    expect(submit?.disabled).toBe(true);
    expect(host.querySelector('textarea')?.disabled).toBe(true);
    expect([...host.querySelectorAll('input')].every((input) => input.disabled)).toBe(true);
  });

  it('dirige vers l’adresse email en attendant', () => {
    const hint = host.querySelector('#contact-indispo');

    expect(hint?.textContent).toContain('pas encore branché');
    expect(host.querySelector('button[aria-describedby="contact-indispo"]')).not.toBeNull();
  });

  it('associe un libellé à chaque champ', () => {
    const labels = [...host.querySelectorAll('label')].map((l) =>
      l.querySelector('span')?.textContent?.trim(),
    );

    expect(labels).toEqual(['Nom', 'Email', 'Sujet', 'Message']);
  });
});
