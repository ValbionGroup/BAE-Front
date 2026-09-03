import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { ExternalNavigation } from '@bae/ui';
import { TelegramLinkModel } from '#core/models/user.model';
import { memberPhoneChanged, telegramLinkChanged } from '#core/store/auth/auth.actions';

import { Parametres } from './parametres';

const AUTH = {
  user: {
    id: 4,
    casId: 'cas-4',
    email: 'lucie.bernard@enseirb-matmeca.fr',
    hasPassword: true,
    telegram: { handle: null, linked: false, linkedAt: null },
  },
  member: {
    id: 4,
    points: 12,
    firstName: 'Lucie',
    lastName: 'Bernard',
    role: 'Tresorier',
    phone: null,
  },
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

  describe('téléphone', () => {
    const phoneInput = (): HTMLInputElement =>
      (fixture.nativeElement as HTMLElement).querySelector('input[type="tel"]')!;

    const save = (): void => {
      const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
        (el) => el.textContent?.includes('Enregistrer'),
      );
      button?.click();
      fixture.detectChanges();
    };

    function type(value: string): void {
      const el = phoneInput();
      el.value = value;
      el.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    it('affiche le numéro déjà enregistré', async () => {
      TestBed.inject(MockStore).setState({
        auth: { ...AUTH, member: { ...AUTH.member, phone: '+33612345678' } },
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(phoneInput().value).toBe('+33612345678');
    });

    /** Le serveur normalise : c'est sa version qui doit revenir à l'écran. */
    it('réaffiche le numéro normalisé par le serveur, pas la saisie', async () => {
      const http = TestBed.inject(HttpTestingController);
      const dispatched: unknown[] = [];
      TestBed.inject(MockStore).scannedActions$.subscribe((action) => dispatched.push(action));

      type('06 12 34 56 78');
      save();

      const request = http.expectOne((req) => req.url.endsWith('/account/phone'));
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ phone: '06 12 34 56 78' });
      request.flush({ phone: '+33612345678' });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(dispatched).toContainEqual(memberPhoneChanged({ phone: '+33612345678' }));
    });

    it('envoie null quand le champ est vidé', async () => {
      const http = TestBed.inject(HttpTestingController);

      type('   ');
      save();

      const request = http.expectOne((req) => req.url.endsWith('/account/phone'));
      expect(request.request.body).toEqual({ phone: null });
      request.flush({ phone: null });
      await fixture.whenStable();
    });

    it('annonce le refus du serveur sans rien effacer', async () => {
      const http = TestBed.inject(HttpTestingController);

      type('01 42 34 56 78');
      save();

      http
        .expectOne((req) => req.url.endsWith('/account/phone'))
        .flush(
          { code: 'E_PHONE_NOT_MOBILE', message: 'Lydia demande un mobile.' },
          { status: 422, statusText: 'Unprocessable' },
        );
      await fixture.whenStable();
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Lydia demande un mobile.',
      );
      expect(phoneInput().value).toBe('01 42 34 56 78');
    });
  });

  const NO_TELEGRAM: TelegramLinkModel = { handle: null, linked: false, linkedAt: null };

  const LINKED: TelegramLinkModel = {
    handle: 'lea_m',
    linked: true,
    linkedAt: '2026-08-30T12:00:00.000Z',
  };

  describe(`${Parametres.name} — liaison Telegram`, () => {
    let fixture: ComponentFixture<Parametres>;
    let host: HTMLElement;
    let http: HttpTestingController;

    const mount = async (telegram: TelegramLinkModel): Promise<void> => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [Parametres],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          provideMockStore({
            initialState: { auth: { ...AUTH, user: { ...AUTH.user, telegram } } },
          }),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(Parametres);
      host = fixture.nativeElement as HTMLElement;
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      await fixture.whenStable();
    };

    const click = (label: string): void => {
      const button = [...host.querySelectorAll('button')].find((el) =>
        el.textContent?.includes(label),
      );
      expect(button, `bouton « ${label} » introuvable`).toBeDefined();
      button?.click();
      fixture.detectChanges();
    };

    afterEach(() => {
      http.verify();
      TestBed.resetTestingModule();
    });

    /**
     * La liaison se termine dans Telegram : on quitte la page, et le retour
     * réhydrate le profil. Pas de sondage à écrire.
     */
    it('emmène vers Telegram avec l’URL que le serveur a construite', async () => {
      await mount(NO_TELEGRAM);
      const navigation = TestBed.inject(ExternalNavigation);
      vi.spyOn(navigation, 'go').mockImplementation(() => undefined);

      click('Lier mon compte Telegram');

      http
        .expectOne((req) => req.method === 'POST' && req.url.endsWith('/account/telegram/link'))
        .flush({
          url: 'https://t.me/bae_bot?start=K7M3QZ8XW2VP',
          code: 'K7M3QZ8XW2VP',
          botUsername: 'bae_bot',
          expiresAt: '2026-08-30T14:15:00.000Z',
        });
      await fixture.whenStable();
      await fixture.whenStable();

      expect(navigation.go).toHaveBeenCalledWith('https://t.me/bae_bot?start=K7M3QZ8XW2VP');
    });

    it('signale un refus sans emmener nulle part', async () => {
      await mount(NO_TELEGRAM);
      const navigation = TestBed.inject(ExternalNavigation);
      vi.spyOn(navigation, 'go').mockImplementation(() => undefined);

      click('Lier mon compte Telegram');

      http
        .expectOne((req) => req.method === 'POST')
        .flush(
          { code: 'E_TELEGRAM_ALREADY_LINKED', message: 'Déjà lié.' },
          { status: 409, statusText: 'Conflict' },
        );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(navigation.go).not.toHaveBeenCalled();
      expect(host.textContent).toContain('Déjà lié.');
    });

    it('annonce la liaison et rend l’état délié au magasin d’auth', async () => {
      await mount(LINKED);
      const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');

      expect(host.textContent).toContain('Lié');
      expect(host.textContent).toContain('lea_m');

      click('Délier');
      const unlinked: TelegramLinkModel = { handle: 'lea_m', linked: false, linkedAt: null };
      http
        .expectOne((req) => req.method === 'DELETE' && req.url.endsWith('/account/telegram/link'))
        .flush(unlinked);
      await fixture.whenStable();

      expect(dispatch).toHaveBeenCalledWith(telegramLinkChanged({ telegram: unlinked }));
    });

    /**
     * Le défaut visé : la liaison vivait sur `clients`, donc le bureau — à qui
     * s'adressent la plupart des notifications — n'y avait pas droit.
     */
    it('offre la liaison à un membre du bureau sans profil public', async () => {
      await mount(NO_TELEGRAM);

      expect(host.textContent).toContain('Non lié');
      expect(
        [...host.querySelectorAll('button')].some((el) =>
          el.textContent?.includes('Lier mon compte Telegram'),
        ),
      ).toBe(true);
    });
    /**
     * Le caissier renseigne son numéro lui-même : la page Équipe exige
     * `member:write`, que la plupart n'ont pas, et Lydia refuse d'encaisser sans
     * numéro de caissier.
     */
  });
});
