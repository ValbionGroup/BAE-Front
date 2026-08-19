import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExternalNavigation } from '@bae/ui';

import { Fastpass } from './fastpass';
import { SessionStore, type SessionStatus } from '../../core/session.store';
import type { PublicFastPass } from '../../core/catalog.models';

const PASSES: PublicFastPass[] = [
  { id: 1, label: '1 an', description: null, durationYears: 1, priceCents: 2500 },
  { id: 2, label: '2 ans', description: null, durationYears: 2, priceCents: 4200 },
  { id: 3, label: '3 ans', description: null, durationYears: 3, priceCents: 5400 },
];

describe(Fastpass.name, () => {
  let fixture: ComponentFixture<Fastpass>;
  let host: HTMLElement;
  let http: HttpTestingController;

  const mount = async (passes: PublicFastPass[] = PASSES): Promise<void> => {
    fixture = TestBed.createComponent(Fastpass);
    fixture.detectChanges();

    http
      .expectOne((req) => req.url.endsWith('/public/fast-passes'))
      .flush({ bonusPercent: 5, plans: passes });
    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  };

  let sessionStatus: ReturnType<typeof signal<SessionStatus>>;
  let navigation: { go: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    sessionStatus = signal<SessionStatus>('authenticated');
    navigation = { go: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Fastpass],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            status: sessionStatus.asReadonly(),
            isAuthenticated: computed(() => sessionStatus() === 'authenticated'),
          },
        },
        { provide: ExternalNavigation, useValue: navigation },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const text = (): string => host.textContent?.replace(/\s+/g, ' ') ?? '';

  it('rend une carte par formule reçue', async () => {
    await mount();

    const choices = [...host.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('Choisir'),
    );
    expect(choices.length).toBe(3);
  });

  /**
   * Le tarif annuel est **calculé** depuis le prix et la durée reçus, alors que
   * la maquette l'écrivait en dur : « −16 % » et « −28 % » deviendraient faux à
   * la première modification d'un prix en base.
   */
  it('dérive le tarif annuel de la durée reçue', async () => {
    await mount();

    expect(text()).toContain('soit 25 €/an');
    expect(text()).toContain('soit 21 €/an');
    expect(text()).toContain('soit 18 €/an');
  });

  it('chiffre l’économie par rapport à la formule la plus chère à l’année', async () => {
    await mount();

    // 21 €/an contre 25 €/an → 16 % ; 18 €/an → 28 %.
    expect(text()).toContain('−16 %');
    expect(text()).toContain('−28 %');
  });

  it('ne met en avant qu’une seule offre', async () => {
    await mount();

    const badges = [...host.querySelectorAll('div')].filter(
      (d) => d.textContent?.trim() === 'Meilleure offre',
    );
    expect(badges.length).toBe(1);
  });

  /** Deux formules au même tarif annuel ne doivent pas produire deux bandeaux. */
  it('ne met en avant qu’une offre même à tarif annuel égal', async () => {
    await mount([
      { id: 1, label: '1 an', description: null, durationYears: 1, priceCents: 2500 },
      { id: 2, label: '2 ans', description: null, durationYears: 2, priceCents: 5000 },
    ]);

    const badges = [...host.querySelectorAll('div')].filter(
      (d) => d.textContent?.trim() === 'Meilleure offre',
    );
    expect(badges.length).toBe(1);
  });

  const chooseButtons = (): HTMLButtonElement[] =>
    [...host.querySelectorAll('button')].filter((b) => b.textContent?.includes('Choisir'));

  /**
   * Le défaut visé : un bouton « Choisir » inerte, ou qui souscrit sans payer.
   */
  it('choisir une formule ouvre le paiement Lydia et y redirige', async () => {
    await mount();

    expect(chooseButtons()[0].disabled).toBe(false);

    chooseButtons()[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    const opened = http.expectOne((r) => r.url.endsWith('/account/subscriptions'));
    expect(opened.request.body).toEqual({ fastPassId: 1 });

    opened.flush({
      orderRef: 'ref-2',
      status: 'pending',
      amountCents: 2500,
      mobileUrl: 'https://lydia.test/pay/ref-2',
      expiresAt: null,
    });
    await fixture.whenStable();

    expect(navigation.go).toHaveBeenCalledWith('https://lydia.test/pay/ref-2');
  });

  /**
   * Le défaut visé : laisser un visiteur déconnecté souscrire, pour qu'il se
   * heurte au 401 du serveur. Les tarifs restent consultables.
   */
  it('un visiteur déconnecté voit les tarifs mais qu’il faut se connecter', async () => {
    sessionStatus.set('anonymous');
    await mount();

    expect(text()).toContain('1 an');
    expect(text()).toContain('Connectez-vous');
    expect(chooseButtons()).toHaveLength(0);
  });

  /**
   * La maquette affirmait que le FastPass s'ajoute à la cotisation. Le modèle de
   * données dit l'inverse : souscrire une formule **est** l'adhésion.
   */
  it('ne prétend pas que le pass s’ajoute à une cotisation séparée', async () => {
    await mount();

    expect(text()).toContain('Le FastPass est votre adhésion');
    expect(text()).not.toContain('en plus de la cotisation annuelle');
  });

  it('explique l’absence de formule plutôt que d’afficher une grille vide', async () => {
    await mount([]);

    expect(text()).toContain('Aucune formule n’est proposée');
  });

  /**
   * « Précommandes en avant-première » a été retiré : rien ne l'implémente, et
   * aucune colonne ne porterait une ouverture anticipée. Une promesse qu'on ne
   * tient pas se paie au comptoir, pas sur la page.
   */
  it('ne promet pas un accès anticipé qui n’existe pas', async () => {
    await mount();

    expect(text()).not.toContain('avant-première');
  });

  /** Le chiffre vient de l'API, il n'est pas écrit dans le gabarit. */
  it('affiche la réduction adhérent annoncée par le serveur', async () => {
    await mount();

    expect(text()).toContain('−5 % supplémentaires sur vos précommandes');
  });
});
