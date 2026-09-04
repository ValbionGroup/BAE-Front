import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_BASE_URL, ToastService } from '@bae/ui';
import { EventsStore } from '#core/store/events.store';

import { RosterAside } from './roster-aside';

describe(RosterAside.name, () => {
  let component: RosterAside;
  let fixture: ComponentFixture<RosterAside>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RosterAside],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RosterAside);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

/**
 * ⚠️ Le composant a un `effect()` qui appelle `loadEventRoster` dès que
 * `eventId` change : `setInput` déclenche donc une requête HTTP, laissée en
 * attente. Ne pas appeler `httpMock.verify()` ici, il échouerait dessus.
 */
describe(`${RosterAside.name} — relance`, () => {
  let fixture: ComponentFixture<RosterAside>;
  let remindPending: ReturnType<typeof vi.spyOn>;
  let show: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RosterAside],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const httpMock = TestBed.inject(HttpTestingController);
    const baseUrl = TestBed.inject(API_BASE_URL);
    const store = TestBed.inject(EventsStore);

    // Tout le gabarit vit sous `@if (event())` : sans soirée dans le magasin,
    // le bouton n'existe pas. Le magasin n'a pas d'autre porte que `load()`.
    const loaded = store.load();
    httpMock
      .expectOne(`${baseUrl}/events`)
      .flush([{ id: 42, name: 'Soirée test', date: new Date().toISOString() }]);
    await loaded;

    show = vi.spyOn(TestBed.inject(ToastService), 'show');

    fixture = TestBed.createComponent(RosterAside);
    fixture.componentRef.setInput('eventId', '42');
    await fixture.whenStable();

    // Le bouton est désactivé sur un roster vide : il faut donc un membre.
    httpMock
      .expectOne(`${baseUrl}/events/42/roster`)
      .flush([{ id: 1, name: 'Manon Membre', role: 'Membre', status: -1, late: false }]);
    await fixture.whenStable();
    fixture.detectChanges();

    remindPending = vi.spyOn(store, 'remindPending');
  });

  const button = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('[data-testid="remind"] button');

  const click = async (): Promise<void> => {
    button().click();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('appelle le magasin avec la soirée affichée', async () => {
    remindPending.mockResolvedValue({ ok: true, result: { queued: 3, alreadySent: 0 } });

    await click();

    expect(remindPending).toHaveBeenCalledWith('42');
  });

  it('annonce le nombre de membres relancés', async () => {
    remindPending.mockResolvedValue({ ok: true, result: { queued: 3, alreadySent: 0 } });

    await click();

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: '3 membres relancés.' }),
    );
  });

  it('accorde le singulier', async () => {
    remindPending.mockResolvedValue({ ok: true, result: { queued: 1, alreadySent: 0 } });

    await click();

    expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: '1 membre relancé.' }));
  });

  it('distingue une relance déjà partie aujourd’hui', async () => {
    remindPending.mockResolvedValue({ ok: true, result: { queued: 0, alreadySent: 4 } });

    await click();

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info', title: 'Déjà relancés aujourd’hui.' }),
    );
  });

  it('distingue le cas où tout le monde a répondu', async () => {
    remindPending.mockResolvedValue({ ok: true, result: { queued: 0, alreadySent: 0 } });

    await click();

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info', title: 'Tout le monde a répondu.' }),
    );
  });

  it('affiche le refus du serveur', async () => {
    remindPending.mockResolvedValue({
      ok: false,
      error: new HttpErrorResponse({
        status: 422,
        error: { code: 'E_EVENT_NOT_SCHEDULED', message: 'Soirée close.' },
      }),
    });

    await click();

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'Soirée close.' }),
    );
  });

  it('désactive le bouton pendant l’appel', () => {
    let release: (value: unknown) => void = () => {};
    remindPending.mockReturnValue(new Promise((resolve) => (release = resolve)));

    button().click();
    fixture.detectChanges();

    expect(button().disabled).toBe(true);

    release({ ok: true, result: { queued: 1, alreadySent: 0 } });
  });
});
