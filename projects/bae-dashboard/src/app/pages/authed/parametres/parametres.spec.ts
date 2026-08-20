import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { Parametres } from './parametres';

const AUTH = {
  user: { id: 4, casId: 'cas-4', email: 'lucie.bernard@enseirb-matmeca.fr' },
  member: { id: 4, points: 12, firstName: 'Lucie', lastName: 'Bernard', role: 'Tresorier' },
  permissions: [],
};

describe(Parametres.name, () => {
  let fixture: ComponentFixture<Parametres>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Parametres],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({ initialState: { auth: AUTH } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Parametres);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  /**
   * Le défaut visé : la page affichait une identité écrite en dur, la même pour
   * tout le monde. Chacun s'y voyait sous le nom de quelqu'un d'autre.
   */
  it('affiche le membre connecté, pas une identité figée', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Lucie Bernard');
    expect(text).toContain('lucie.bernard@enseirb-matmeca.fr');
    expect(text).toContain('Tresorier');
  });

  /**
   * Le défaut visé, distinct : un membre sans nom connu — le profil n'a pas
   * encore répondu, ou EirbConnect n'a pas fourni le claim — donnerait une carte
   * vide, sans rien pour l'identifier.
   */
  it('retombe sur l’email quand aucun nom n’est connu', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Parametres],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({ initialState: { auth: { user: AUTH.user } } }),
      ],
    }).compileComponents();

    const bare = TestBed.createComponent(Parametres);
    bare.detectChanges();
    await bare.whenStable();

    expect((bare.nativeElement as HTMLElement).textContent).toContain(
      'lucie.bernard@enseirb-matmeca.fr',
    );
  });
});
