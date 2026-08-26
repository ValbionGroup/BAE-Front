import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { Sidebar } from './sidebar';
import { Permission } from '#core/models/permission.model';

/**
 * Les jeux de permissions du back, recopiés de `database/rbac_catalog.ts`.
 * C'est une duplication assumée : c'est précisément elle qui fait de ces tests
 * un détecteur de dérive. Si le back rouvre ou ferme un droit sans qu'on ajuste
 * la barre, un de ces cas vire au rouge.
 */
const BASE: Permission[] = [
  'presence:read',
  'presence:write',
  'member:read',
  'menu:read',
  'event:read',
  'order:read',
  'order:serve',
];

const ROLES: Record<string, Permission[]> = {
  Membre: [],
  'Pole BBQ': [
    'stock:read',
    'stock:write',
    'product:read',
    'restock:read',
    'restock:write',
    'good:read',
    'furniture:read',
  ],
  'Pole Log': [
    'stock:read',
    'stock:write',
    'stock:delete',
    'product:read',
    'product:write',
    'product:delete',
    'restock:read',
    'restock:write',
    'restock:delete',
    'supplier:read',
    'voucher:read',
    'voucher:write',
    'voucher:delete',
    'menu:write',
    'menu:delete',
    'category:read',
    'good:read',
    'furniture:read',
  ],
  Secretaire: ['log:read', 'role:read', 'client:read', 'subscription:read', 'ticket:read'],
  Coordinateur: [
    'event:matching',
    'event:settle',
    'event:write',
    'event:delete',
    'assignment:write',
    'stock:read',
    'menu:write',
    'job:read',
    'job:write',
    'order:write',
    'order:delete',
  ],
  Tresorier: [
    'supplier:read',
    'restock:read',
    'product:read',
    'stock:read',
    'log:read',
    'voucher:read',
    'fast-pass:read',
    'transaction:read',
    'order:write',
    'order:delete',
    'client:read',
    'subscription:read',
  ],
};

async function render(permissions: Permission[]): Promise<ComponentFixture<Sidebar>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Sidebar],
    providers: [provideRouter([]), provideMockStore({ initialState: { auth: { permissions } } })],
  }).compileComponents();

  const fixture = TestBed.createComponent(Sidebar);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

/** Les libellés des entrées effectivement rendues, dans l'ordre de la barre. */
function labels(fixture: ComponentFixture<Sidebar>): string[] {
  const host = fixture.nativeElement as HTMLElement;
  return Array.from(host.querySelectorAll('a')).map((link) => (link.textContent ?? '').trim());
}

function text(fixture: ComponentFixture<Sidebar>): string {
  return ((fixture.nativeElement as HTMLElement).textContent ?? '').trim();
}

describe('Sidebar — ce que chaque rôle voit', () => {
  it('Membre : la base seule, donc aucun poste de préparation', async () => {
    const fixture = await render(BASE);

    expect(labels(fixture)).toEqual([
      'Accueil',
      'Présences',
      'Pilotage soirée',
      'Analyse',
      'Tickets',
      'Paramètres',
    ]);
  });

  it('Pole BBQ : la cuisine, sans la caisse', async () => {
    const fixture = await render([...BASE, ...ROLES['Pole BBQ']]);
    const shown = labels(fixture);

    expect(shown).toContain('Pilotage soirée');
    expect(shown).toContain('Stocks');
    // Le cœur du lot : il fait avancer les tickets, il n'encaisse pas.
    expect(shown).not.toContain('Caisse');
    expect(shown).not.toContain('Précommandes');
  });

  it('Pole Log : la préparation entière, pas le comptoir', async () => {
    const shown = labels(await render([...BASE, ...ROLES['Pole Log']]));

    expect(shown).toContain('Stocks');
    expect(shown).toContain('Recettes');
    expect(shown).toContain('Logistique');
    expect(shown).not.toContain('Caisse');
    expect(shown).not.toContain('Coordination');
  });

  it('Secrétaire : les adhérents et l’équipe, rien de la préparation', async () => {
    const shown = labels(await render([...BASE, ...ROLES['Secretaire']]));

    expect(shown).toContain('Adhérents');
    expect(shown).toContain('Équipe BAE');
    expect(shown).not.toContain('Stocks');
    expect(shown).not.toContain('Logistique');
  });

  it('Coordinateur : la coordination et la caisse, pas la trésorerie', async () => {
    const shown = labels(await render([...BASE, ...ROLES['Coordinateur']]));

    expect(shown).toContain('Coordination');
    expect(shown).toContain('Caisse');
    expect(shown).not.toContain('Paiements');
    // Conséquence d'un trou du catalogue back, pas d'une intention : le
    // Coordinateur a `menu:write` mais pas `product:read`, or la page Recettes
    // tape `/products/*`. Le filtrage rend visible un 403 qu'il subit déjà.
    expect(shown).not.toContain('Recettes');
  });

  it('Trésorier : la caisse et les paiements, pas la coordination', async () => {
    const shown = labels(await render([...BASE, ...ROLES['Tresorier']]));

    expect(shown).toContain('Paiements');
    expect(shown).toContain('Adhérents');
    expect(shown).toContain('Logistique');
    expect(shown).not.toContain('Coordination');
    expect(shown).not.toContain('Équipe BAE');
  });

  it('Président : tout, et rien de masqué', async () => {
    const all: Permission[] = [
      ...BASE,
      'client:read',
      'stock:read',
      'product:read',
      'job:read',
      'voucher:read',
      'order:write',
      'transaction:read',
      'role:read',
    ];

    expect(labels(await render(all))).toEqual([
      'Accueil',
      'Présences',
      'Adhérents',
      'Stocks',
      'Recettes',
      'Coordination',
      'Logistique',
      'Référentiels',
      'Caisse',
      'Précommandes',
      'Pilotage soirée',
      'Paiements',
      'Analyse',
      'Tickets',
      'Équipe BAE',
      'Paramètres',
    ]);
  });
});

describe('Sidebar — les titres de groupe', () => {
  it('ne laisse pas flotter le titre d’un groupe entièrement masqué', async () => {
    // Un Membre n'a aucune entrée de « Préparation » : le titre doit tomber
    // avec elles, sinon la barre affiche une section vide.
    const fixture = await render(BASE);

    expect(text(fixture)).not.toContain('Préparation');
    expect(text(fixture)).toContain('Soirée');
  });

  it('garde le titre dès qu’une seule entrée du groupe survit', async () => {
    const fixture = await render([...BASE, 'stock:read']);

    expect(text(fixture)).toContain('Préparation');
  });
});
