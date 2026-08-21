import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { Notifications } from './notifications';
import {
  NotificationsService,
  type ApiNotification,
} from '#core/services/notifications/notifications-service';

function notification(overrides: Partial<ApiNotification> = {}): ApiNotification {
  return {
    id: 1,
    verb: 'presence.pending',
    subjectType: 'event',
    subjectId: 4,
    payload: { subject: 'Réponds', lines: ['La soirée Gala a lieu vendredi.'] },
    occurredAt: new Date().toISOString(),
    readAt: null,
    channels: [{ channel: 'in_app', sentAt: null }],
    ...overrides,
  };
}

async function build(list: readonly ApiNotification[], markRead = vi.fn()) {
  await TestBed.configureTestingModule({
    imports: [Notifications],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: NotificationsService,
        useValue: { list: () => of(list), markRead, markAllRead: vi.fn(() => of({ updated: 0 })) },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Notifications);
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
  return fixture;
}

describe('Notifications', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('affiche le libellé du verbe, pas le verbe brut', async () => {
    const fixture = await build([notification()]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Réponse attendue');
    expect(text).toContain('La soirée Gala a lieu vendredi.');
    expect(text).not.toContain('presence.pending');
  });

  /** Un verbe inconnu reste affiché : mieux vaut un rendu générique qu'un trou. */
  it('affiche quand même une notification dont le verbe est inconnu', async () => {
    const fixture = await build([
      notification({ verb: 'quelque.chose.de.neuf', payload: { subject: 'Un fait nouveau' } }),
    ]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Un fait nouveau');
  });

  /**
   * Un rappel de présence part **par mail seulement** : `emit()` retombe sur son
   * défaut `['mail']`. L'écran ne disait donc rien de son acheminement, alors que
   * `MAIL_MAILER=log` avale les messages sans rien signaler — l'état de la file
   * est la seule chose qui distingue « parti » de « jamais parti ».
   */
  it.each([
    {
      label: 'une livraison in-app seule ne mentionne aucun acheminement',
      channels: [{ channel: 'in_app' as const, sentAt: null }],
      expected: '',
    },
    {
      label: 'un mail encore en file le dit',
      channels: [{ channel: 'mail' as const, sentAt: null }],
      expected: 'par mail · en file d’envoi',
    },
    {
      label: 'un mail parti porte sa date',
      channels: [{ channel: 'mail' as const, sentAt: '2026-08-18T09:30:00.000Z' }],
      expected: 'par mail · envoyé le 18/08',
    },
  ])('$label', async ({ channels, expected }) => {
    const fixture = await build([notification({ channels })]);

    const delivery = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="delivery"]',
    );

    expect(delivery?.textContent?.trim() ?? '').toBe(expected);
  });

  it('ne rappelle pas le serveur pour une notification déjà lue', async () => {
    const markRead = vi.fn(() => of({ id: 1, readAt: new Date().toISOString() }));
    const fixture = await build([notification({ readAt: new Date().toISOString() })], markRead);

    const row = (fixture.nativeElement as HTMLElement).querySelector('button[type="button"]');
    (row as HTMLButtonElement | null)?.click();
    await fixture.whenStable();

    expect(markRead).not.toHaveBeenCalled();
  });
});
