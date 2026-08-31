import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL, ExternalNavigation } from '@bae/ui';
import { vi } from 'vitest';
import { findA11yViolations } from '@bae/ui/testing';

import { ProfileForm } from './profile-form';
import {
  SessionStore,
  type ClientProfile,
  type ProfileResponse,
  type TelegramLink,
} from '../../../../core/session.store';

const NO_TELEGRAM: TelegramLink = { handle: null, linked: false, linkedAt: null };

const LINKED: TelegramLink = {
  handle: 'lea_m',
  linked: true,
  linkedAt: '2026-08-30T12:00:00.000Z',
};

const CLIENT: ClientProfile = {
  phone: '0612345678',
  promotion: 'I2',
  school: 'ENSEIRB',
  registeredAt: '2026-01-12',
  preparationNote: 'Sans gluten',
};

/** Le pseudo vit sur `user`, le reste sur `client` : lire et écrire rendent cette enveloppe. */
const profileBody = (
  telegram: TelegramLink = NO_TELEGRAM,
  client: ClientProfile = CLIENT,
): ProfileResponse => ({
  user: { id: 7, email: 'lea@enseirb.fr', telegram },
  member: null,
  client,
});

describe(ProfileForm.name, () => {
  let fixture: ComponentFixture<ProfileForm>;
  let host: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  const mount = async (telegram: TelegramLink = NO_TELEGRAM): Promise<void> => {
    TestBed.inject(SessionStore).load();
    http.expectOne((req) => req.url.endsWith('/account/profile')).flush(profileBody(telegram));

    fixture = TestBed.createComponent(ProfileForm);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const field = (name: string): HTMLInputElement | HTMLTextAreaElement =>
    host.querySelector(`[data-field="${name}"] input, [data-field="${name}"] textarea`)!;

  const type = (name: string, value: string): void => {
    const el = field(name);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const submit = (): void => {
    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  it('reprend les valeurs déjà enregistrées', async () => {
    await mount();

    expect(field('phone').value).toBe('0612345678');
    expect(field('preparationNote').value).toBe('Sans gluten');
  });

  /** Rien n'a bougé : un PATCH vide ferait croire à un enregistrement. */
  it('n’enregistre pas tant que rien n’a changé', async () => {
    await mount();

    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
  });

  it('n’envoie que les champs modifiés', async () => {
    await mount();
    type('phone', '0699999999');
    submit();

    const request = http.expectOne((req) => req.method === 'PATCH');
    expect(request.request.body).toEqual({ phone: '0699999999' });
    request.flush(profileBody(NO_TELEGRAM, { ...CLIENT, phone: '0699999999' }));
  });

  it('envoie null plutôt qu’une chaîne vide pour un champ effacé', async () => {
    await mount();
    type('preparationNote', '');
    submit();

    const request = http.expectOne((req) => req.method === 'PATCH');
    expect(request.request.body).toEqual({ preparationNote: null });
    request.flush(profileBody(NO_TELEGRAM, { ...CLIENT, preparationNote: null }));
  });

  /** La règle Telegram est connue du navigateur : inutile de déranger le serveur. */
  it('refuse un pseudo Telegram invalide sans appeler le serveur', async () => {
    await mount();
    type('telegramHandle', 'a-b');
    submit();

    http.expectNone((req) => req.method === 'PATCH');
    expect(host.textContent).toContain('Pseudo Telegram invalide');
  });

  it('accepte un pseudo copié avec son arobase', async () => {
    await mount();
    type('telegramHandle', '@lea_m');
    submit();

    const request = http.expectOne((req) => req.method === 'PATCH');
    expect(request.request.body).toEqual({ telegramHandle: '@lea_m' });
    request.flush(profileBody({ ...NO_TELEGRAM, handle: 'lea_m' }));
  });

  it('annonce l’échec du serveur dans une alerte', async () => {
    await mount();
    type('phone', '0699999999');
    submit();

    http
      .expectOne((req) => req.method === 'PATCH')
      .flush(
        { code: 'E_OOPS', message: 'Enregistrement impossible.' },
        { status: 500, statusText: 'Server Error' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Enregistrement impossible.',
    );
  });

  /** Tant qu'aucun bot n'existe, l'état honnête est « non lié », pas un silence. */
  it('dit que le compte Telegram n’est pas encore lié', async () => {
    await mount({ ...NO_TELEGRAM, handle: 'lea_m' });

    expect(host.textContent).toContain('Non lié');
  });

  it('ne présente aucune violation d’accessibilité', async () => {
    await mount();

    expect(await findA11yViolations(host)).toEqual([]);
  });

  const click = (label: string): void => {
    const button = [...host.querySelectorAll('button')].find((el) =>
      el.textContent?.includes(label),
    );
    expect(button, `bouton « ${label} » introuvable`).toBeDefined();
    button?.click();
    fixture.detectChanges();
  };

  /**
   * La liaison se termine dans Telegram : on quitte la page, et le retour
   * recharge l'application, donc le profil. Pas de sondage à écrire.
   */
  it('emmène vers Telegram avec l’URL que le serveur a construite', async () => {
    await mount();
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

  it('annonce la liaison et propose de délier', async () => {
    await mount(LINKED);

    expect(host.textContent).toContain('Lié');
    expect(host.textContent).not.toContain('Non lié');

    click('Délier');
    http
      .expectOne((req) => req.method === 'DELETE' && req.url.endsWith('/account/telegram/link'))
      .flush({ handle: 'lea_m', linked: false, linkedAt: null });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.textContent).toContain('Non lié');
  });

  /** Telegram réécrit le pseudo à chaque liaison : une saisie manuelle serait effacée. */
  it('verrouille le pseudo une fois le compte lié', async () => {
    await mount(LINKED);

    expect(field('telegramHandle').disabled).toBe(true);
  });

  it('laisse le pseudo saisissable tant que rien n’est lié', async () => {
    await mount();

    expect(field('telegramHandle').disabled).toBe(false);
  });
});
