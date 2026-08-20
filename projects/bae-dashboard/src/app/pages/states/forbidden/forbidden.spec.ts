import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ExternalNavigation, PUBLIC_APP_URL } from '@bae/ui';
import { findA11yViolations } from '@bae/ui/testing';

import { Forbidden } from './forbidden';
import * as AuthActions from '#core/store/auth/auth.actions';
import type { UserModel } from '#core/models/user.model';

const PUBLIC_URL = 'https://adherents.bae.test';

describe(Forbidden.name, () => {
  let fixture: ComponentFixture<Forbidden>;
  let store: MockStore;
  let navigation: ExternalNavigation;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Forbidden],
      providers: [
        provideMockStore({
          initialState: {
            auth: { user: { id: 1, casId: 'x', email: 'lea.marchand@enseirb.fr' } as UserModel },
          },
        }),
        { provide: PUBLIC_APP_URL, useValue: PUBLIC_URL },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    navigation = TestBed.inject(ExternalNavigation);
    fixture = TestBed.createComponent(Forbidden);
    fixture.detectChanges();
  });

  /** Sans elle, la carte d'identité est un cadre vide : on ne sait plus qui est connecté. */
  it('nomme le compte connecté', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('lea.marchand@enseirb.fr');
  });

  it('renvoie vers la zone publique par une navigation externe', () => {
    const go = vi.spyOn(navigation, 'go').mockImplementation(() => undefined);

    button('Retour à l’espace adhérent').click();

    expect(go).toHaveBeenCalledWith(PUBLIC_URL);
  });

  it('rend la page sans violation d’accessibilité', async () => {
    expect(await findA11yViolations(fixture.nativeElement)).toEqual([]);
  });

  it('déconnecte sur demande', () => {
    const dispatch = vi.spyOn(store, 'dispatch');

    button('Se déconnecter').click();

    expect(dispatch).toHaveBeenCalledWith(AuthActions.logout());
  });

  function button(label: string): HTMLButtonElement {
    const found = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((candidate) => candidate.textContent?.includes(label));

    if (found === undefined) throw new Error(`Bouton « ${label} » introuvable`);
    return found as HTMLButtonElement;
  }
});
