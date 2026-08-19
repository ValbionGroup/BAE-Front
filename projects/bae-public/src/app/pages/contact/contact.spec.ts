import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL, ExternalNavigation } from '@bae/ui';
import { vi } from 'vitest';

import { Contact } from './contact';
import { SessionStore } from '../../core/session.store';

describe(Contact.name, () => {
  let fixture: ComponentFixture<Contact>;
  let host: HTMLElement;
  let http: HttpTestingController;
  let session: SessionStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    http.verify();
    // Les fichiers de test partagent un environnement : sans remise à zéro, le
    // `TestBed` reste instancié et le fichier suivant échoue à se configurer.
    TestBed.resetTestingModule();
  });

  /** Connecte le visiteur en répondant au `/account/profile` que le store émet. */
  const signIn = async (): Promise<void> => {
    session.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({
        user: { id: 7, email: 'lea.marchand@enseirb-matmeca.fr' },
        member: { firstName: 'Léa', lastName: 'Marchand' },
      });
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const submitButton = (): HTMLButtonElement | undefined =>
    [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Envoyer'));

  it('affiche les trois canaux de contact', () => {
    expect(host.textContent).toContain('bureau.alternants@enseirb-matmeca.fr');
    expect(host.textContent).toContain('Permanence');
    expect(host.textContent).toContain('tresorerie.bae@enseirb-matmeca.fr');
  });

  /**
   * ⚠️ `POST /v1/tickets` exige une session — un anonyme reçoit un 401. Laisser
   * le formulaire actif produirait un envoi refusé après coup, alors que la
   * page reste ouverte à tous pour ses trois canaux de contact.
   */
  it('invite à se connecter tant que le visiteur est anonyme', async () => {
    session.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ code: 'E_UNAUTHORIZED', message: 'nope' }, { status: 401, statusText: 'nope' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('textarea')?.disabled).toBe(true);
    expect(host.textContent).toContain('Connectez-vous');
    expect(host.textContent).toContain('bureau.alternants@enseirb-matmeca.fr');
  });

  it('emmène vers EirbConnect depuis le formulaire', async () => {
    const navigation = TestBed.inject(ExternalNavigation);
    vi.spyOn(navigation, 'go').mockImplementation(() => undefined);
    session.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ code: 'E_UNAUTHORIZED', message: 'nope' }, { status: 401, statusText: 'nope' });
    await fixture.whenStable();
    fixture.detectChanges();

    [...host.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('EirbConnect'))
      ?.click();

    expect(navigation.go).toHaveBeenCalledWith(
      'http://api.test/v1/auth/keycloak/redirect?app=public',
    );
  });

  /**
   * ⚠️ `tickets` n'a ni colonne `name` ni colonne `email` : l'auteur vient de
   * `users`, par `author_id`. Les champs sont donc affichés en lecture seule —
   * les rendre saisissables laisserait croire qu'ils voyagent avec le message.
   */
  it('préremplit l’identité en lecture seule une fois connecté', async () => {
    await signIn();

    const readOnly = [...host.querySelectorAll('input')].filter((input) => input.readOnly);
    const values = readOnly.map((input) => input.value);

    expect(values).toContain('Léa Marchand');
    expect(values).toContain('lea.marchand@enseirb-matmeca.fr');
  });

  it('refuse d’envoyer un sujet de moins de trois caractères', async () => {
    await signIn();

    fixture.componentInstance['form'].setValue({ subject: 'ab', body: 'Un message complet.' });
    fixture.detectChanges();

    expect(submitButton()?.disabled).toBe(true);
  });

  it('ouvre un ticket avec le sujet et le message', async () => {
    await signIn();

    fixture.componentInstance['form'].setValue({
      subject: 'Retrait impossible',
      body: 'Le QR ne passe pas au comptoir.',
    });
    fixture.detectChanges();
    submitButton()?.click();

    const sent = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/tickets'));
    expect(sent.request.body).toEqual({
      subject: 'Retrait impossible',
      body: 'Le QR ne passe pas au comptoir.',
    });

    sent.flush({ id: 3, subject: 'Retrait impossible', status: 'open' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('message');
  });

  /**
   * Le front public ne rend aucun `<bae-toast-container />` : un toast d'erreur
   * ne s'afficherait nulle part, silencieusement. Le retour est donc inline.
   */
  it('affiche l’échec dans la page, pas ailleurs', async () => {
    await signIn();

    fixture.componentInstance['form'].setValue({
      subject: 'Retrait impossible',
      body: 'Le QR ne passe pas au comptoir.',
    });
    fixture.detectChanges();
    submitButton()?.click();

    http
      .expectOne((req) => req.method === 'POST' && req.url.endsWith('/tickets'))
      .flush(
        { code: 'E_OOPS', message: 'Serveur indisponible.' },
        { status: 500, statusText: 'x' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Serveur indisponible.');
  });
});
