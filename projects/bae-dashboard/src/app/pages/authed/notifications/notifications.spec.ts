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

  it('ne rappelle pas le serveur pour une notification déjà lue', async () => {
    const markRead = vi.fn(() => of({ id: 1, readAt: new Date().toISOString() }));
    const fixture = await build([notification({ readAt: new Date().toISOString() })], markRead);

    const row = (fixture.nativeElement as HTMLElement).querySelector('button[type="button"]');
    (row as HTMLButtonElement | null)?.click();
    await fixture.whenStable();

    expect(markRead).not.toHaveBeenCalled();
  });
});
