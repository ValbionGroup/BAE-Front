import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { Tickets } from './tickets';
import { TicketsService, type TicketRow } from '#core/services/tickets/tickets-service';

function row(overrides: Partial<TicketRow> = {}): TicketRow {
  return {
    id: 1,
    subject: 'La caisse plante',
    status: 'open',
    priority: 'normal',
    authorId: 12,
    authorName: 'Camille Renard',
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

async function build(service: Partial<TicketsService>) {
  await TestBed.configureTestingModule({
    imports: [Tickets],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: TicketsService,
        useValue: {
          list: () => of([row()]),
          get: () => of({ ...row(), messages: [] }),
          open: vi.fn(),
          reply: vi.fn(),
          setStatus: vi.fn(),
          ...service,
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Tickets);
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
  return fixture;
}

describe('Tickets', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('liste les tickets rendus par le serveur', async () => {
    const fixture = await build({});

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('La caisse plante');
    expect(text).toContain('Camille Renard');
  });

  it('filtre par onglet', async () => {
    const fixture = await build({
      list: () =>
        of([
          row({ id: 1, subject: 'Panne de scanner' }),
          row({ id: 2, subject: 'Question de facture', status: 'closed' }),
        ]),
    });

    fixture.componentInstance['activeTab'].set('Clos');
    fixture.detectChanges();

    // Le texte de la page contient les libellés d'onglets (« Ouverts », « Clos ») :
    // l'assertion porte donc sur les sujets, qui n'appartiennent qu'aux lignes.
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Question de facture');
    expect(text).not.toContain('Panne de scanner');
  });

  /**
   * Le serveur tranche sur `ticket:write`. Un refus est une réponse légitime, et
   * l'écran doit l'expliquer plutôt que d'afficher un état que le serveur a
   * refusé d'enregistrer.
   */
  it('explique un refus de changement de statut', async () => {
    const fixture = await build({
      setStatus: () => throwError(() => new Error('403')),
    });

    fixture.componentInstance['selectedId'].set(1);
    await fixture.componentInstance['setStatus']('closed');
    fixture.detectChanges();

    expect(fixture.componentInstance['loadError']()).toContain('pas le droit');
  });
});
