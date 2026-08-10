import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideChefHat,
  LucideDownload,
  LucideDynamicIcon,
  LucideFilter,
  LucideMoreHorizontal,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTriangleAlert,
} from '@lucide/angular';
import { Router } from '@angular/router';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { LogistiqueAssignModal } from '#shared/components/modal/logistique-assign-modal/logistique-assign-modal';
import { LogistiqueGenerateModal } from '#shared/components/modal/logistique-generate-modal/logistique-generate-modal';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';
import { DropdownService } from '#shared/components/dropdown/dropdown.service';
import { DropdownItem } from '#shared/components/dropdown/dropdown.models';

interface Recipe {
  readonly id: string;
  readonly nom: string;
  readonly cout: number;
  readonly usage: string;
}

const RECIPE_CATALOG: readonly Recipe[] = [
  { id: 'hd-clas', nom: 'Burger Classic', cout: 2.8, usage: 'Plat principal' },
  { id: 'hd-veg', nom: 'Burger Végétarien', cout: 2.5, usage: 'Plat principal' },
  { id: 'frites', nom: 'Frites maison', cout: 0.6, usage: 'Accompagnement' },
  { id: 'crepe-n', nom: 'Crêpe Nutella', cout: 0.9, usage: 'Dessert' },
  { id: 'crepe-s', nom: 'Crêpe Sucre', cout: 0.7, usage: 'Dessert' },
  { id: 'pano', nom: 'Panoplie Boissons', cout: 1.1, usage: 'Boisson' },
  { id: 'tapas', nom: 'Tapas assortis', cout: 3.2, usage: 'Entrée' },
  { id: 'sangria', nom: 'Sangria maison', cout: 1.4, usage: 'Boisson' },
];

type EventStatus = 'preparing' | 'planning' | 'past';
type RecipeStock = 'ok' | 'warn' | 'low' | 'todo' | 'past';
type TabKey = 'upcoming' | 'preparing' | 'past' | 'all';

interface RecipeLine {
  readonly id: string;
  readonly name: string;
  readonly unitCost: number;
  count: number;
  stock: RecipeStock;
}

interface EventBlock {
  readonly id: string;
  readonly day: string;
  readonly month: string;
  readonly name: string;
  readonly when: string;
  readonly status: EventStatus;
  readonly statusLabel: string;
  readonly statusKind: BadgeKind;
  readonly expected: number;
  recipes: RecipeLine[];
}

const MONTH_FR: readonly string[] = [
  'JAN',
  'FÉV',
  'MAR',
  'AVR',
  'MAI',
  'JUN',
  'JUL',
  'AOÛ',
  'SEP',
  'OCT',
  'NOV',
  'DÉC',
];

@Component({
  selector: 'bfd-logistique-events',
  imports: [Btn, Badge, Input, LucideDynamicIcon],
  templateUrl: './events.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogistiqueEvents {
  private readonly dropdown = inject(DropdownService);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly modals = inject(ModalService);
  private readonly router = inject(Router);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  /**
   * Ouvre la liste de courses de la soirée.
   *
   * `/logistique/:id` existait sans qu'aucun écran n'y mène : la page était
   * inatteignable autrement qu'en tapant l'URL à la main.
   */
  protected openCourses(eventId: string): void {
    void this.router.navigate(['/logistique', eventId]);
  }

  protected openAssign(eventId: string): void {
    const ev = this.events().find((e) => e.id === eventId);
    const label = ev ? `${ev.name.toUpperCase()} · ${ev.day}/${ev.month}` : 'SOIRÉE';
    this.modals.open({
      type: 'component',
      component: LogistiqueAssignModal,
      inputs: { eventLabel: label },
    });
  }

  protected openGenerate(): void {
    this.modals.open({ type: 'component', component: LogistiqueGenerateModal });
  }

  constructor() {
    this.pageHeader.set({
      title: 'Logistique',
      subtitle: 'Vue par soirée · recettes & quantités',
      breadcrumb: ['Préparation', 'Logistique', 'Soirées'],
      activeNavId: 'log',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icPlus = LucidePlus;
  protected readonly icEdit = LucidePencil;
  protected readonly icMore = LucideMoreHorizontal;
  protected readonly icChef = LucideChefHat;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icCalendar = LucideCalendar;
  protected readonly icFilter = LucideFilter;
  protected readonly icSearch = LucideSearch;
  protected readonly icDownload = LucideDownload;

  protected readonly catalog = signal<readonly Recipe[]>(RECIPE_CATALOG);

  protected readonly events = signal<EventBlock[]>([
    {
      id: 'hiv26',
      day: '14',
      month: 'FÉV',
      name: 'Soirée Hivernale',
      when: 'Ven. 19:30 — 23:00',
      status: 'preparing',
      statusLabel: 'En préparation',
      statusKind: 'warn',
      expected: 360,
      recipes: this.seed([
        ['hd-clas', 220, 'ok'],
        ['hd-veg', 40, 'warn'],
        ['frites', 180, 'ok'],
        ['crepe-n', 90, 'ok'],
        ['pano', 220, 'low'],
      ]),
    },
    {
      id: 'carn26',
      day: '07',
      month: 'MAR',
      name: 'Carnaval BAE',
      when: 'Ven. 19:00 — 23:30',
      status: 'planning',
      statusLabel: 'À planifier',
      statusKind: 'blue',
      expected: 280,
      recipes: this.seed([
        ['tapas', 280, 'todo'],
        ['sangria', 180, 'todo'],
      ]),
    },
    {
      id: 'rep26',
      day: '28',
      month: 'MAR',
      name: 'Repas Alternants',
      when: 'Jeu. 19:30 — 22:00',
      status: 'planning',
      statusLabel: 'À planifier',
      statusKind: 'blue',
      expected: 80,
      recipes: [],
    },
    {
      id: 'bv26',
      day: '24',
      month: 'JAN',
      name: 'Bienvenue 2026',
      when: 'Passée · 218 commandes',
      status: 'past',
      statusLabel: 'Passée',
      statusKind: 'ok',
      expected: 220,
      recipes: this.seed([
        ['hd-clas', 150, 'past'],
        ['crepe-s', 80, 'past'],
        ['pano', 160, 'past'],
      ]),
    },
  ]);

  protected readonly activeTab = signal<TabKey>('upcoming');

  protected readonly tabs = computed(() => {
    const list = this.events();
    const upcoming = list.filter((e) => e.status !== 'past').length;
    const preparing = list.filter((e) => e.status === 'preparing').length;
    const past = list.filter((e) => e.status === 'past').length;
    return [
      { key: 'upcoming' as TabKey, label: 'À venir', count: upcoming },
      { key: 'preparing' as TabKey, label: 'En préparation', count: preparing },
      { key: 'past' as TabKey, label: 'Passées', count: past },
      { key: 'all' as TabKey, label: 'Tout', count: list.length },
    ];
  });

  protected readonly visibleEvents = computed<readonly EventBlock[]>(() => {
    const tab = this.activeTab();
    const list = this.events();
    if (tab === 'all') return list;
    if (tab === 'preparing') return list.filter((e) => e.status === 'preparing');
    if (tab === 'past') return list.filter((e) => e.status === 'past');
    return list.filter((e) => e.status !== 'past');
  });

  protected setTab(key: TabKey): void {
    this.activeTab.set(key);
  }

  private seed(entries: readonly (readonly [string, number, RecipeStock])[]): RecipeLine[] {
    return entries.flatMap(([id, count, stock]) => {
      const r = RECIPE_CATALOG.find((x) => x.id === id);
      return r ? [{ id: r.id, name: r.nom, unitCost: r.cout, count, stock }] : [];
    });
  }

  protected monthOf(day: string, month: string): string {
    // month string may already be French short; pass through.
    return month;
  }

  protected formatPrice(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }

  protected formatPriceInt(n: number): string {
    return n.toFixed(0);
  }

  protected totalCost(e: EventBlock): number {
    return e.recipes.reduce((s, r) => s + r.unitCost * r.count, 0);
  }

  protected hasMissing(e: EventBlock): boolean {
    return e.recipes.some((r) => r.stock === 'warn' || r.stock === 'low');
  }

  protected missingCount(e: EventBlock): number {
    return e.recipes.filter((r) => r.stock === 'warn' || r.stock === 'low').length;
  }

  protected eventBorderClass(e: EventBlock): string {
    return e.status === 'preparing' ? 'border-warn' : 'border-border-s';
  }

  protected dateChipClass(e: EventBlock): string {
    return e.status === 'preparing'
      ? 'bg-red-soft text-red border-red'
      : 'bg-surface-2 text-text-2 border-border-s';
  }

  protected stockText(
    r: RecipeLine,
  ): { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' } | null {
    switch (r.stock) {
      case 'ok':
        return { label: 'Suffisant', tone: 'ok' };
      case 'warn':
        return { label: 'Manque 12 u.', tone: 'warn' };
      case 'low':
        return { label: 'Manque 40 u.', tone: 'danger' };
      case 'todo':
        return { label: 'À calculer', tone: 'muted' };
      case 'past':
        return null;
    }
  }

  protected stockToneClass(tone: 'ok' | 'warn' | 'danger' | 'muted'): string {
    switch (tone) {
      case 'ok':
        return 'text-ok';
      case 'warn':
        return 'text-warn';
      case 'danger':
        return 'text-danger';
      case 'muted':
        return 'text-muted';
    }
  }

  protected validationBadge(
    r: RecipeLine,
  ): { label: string; kind: BadgeKind; dot: boolean } | null {
    switch (r.stock) {
      case 'past':
        return { label: 'Servie', kind: 'ok', dot: false };
      case 'todo':
        return { label: 'Brouillon', kind: 'ghost', dot: false };
      case 'ok':
        return { label: 'Validée', kind: 'ok', dot: false };
      case 'warn':
        return { label: 'À recompter', kind: 'warn', dot: true };
      case 'low':
        return { label: 'Bloquant', kind: 'danger', dot: true };
    }
  }

  protected openRecipePicker(e: EventBlock, ev: MouseEvent): void {
    ev.stopPropagation();
    const anchor = this.resolveAnchor(ev.currentTarget);
    if (!anchor) return;

    const taken = new Set(e.recipes.map((r) => r.id));
    const available = this.catalog().filter((c: Recipe) => !taken.has(c.id));

    const items: readonly DropdownItem[] = available.map((c: Recipe) => ({
      type: 'action',
      icon: LucideChefHat,
      label: c.nom,
      description: c.usage,
      trailing: `${this.formatPrice(c.cout)} €`,
      onClick: () => this.addFromCatalog(e, c),
    }));

    this.dropdown.toggle({
      anchor,
      placement: 'bottom-end',
      width: 320,
      header: `Recettes disponibles (${available.length})`,
      emptyLabel: 'Toutes les recettes sont déjà ajoutées.',
      items,
    });
  }

  private resolveAnchor(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof HTMLElement)) return null;
    return target.closest('button') ?? target;
  }

  private addFromCatalog(e: EventBlock, c: Recipe): void {
    this.events.update((list) =>
      list.map((ev) =>
        ev.id !== e.id
          ? ev
          : {
              ...ev,
              recipes: [
                ...ev.recipes,
                { id: c.id, name: c.nom, unitCost: c.cout, count: 10, stock: 'todo' },
              ],
            },
      ),
    );
  }

  protected inc(e: EventBlock, r: RecipeLine): void {
    this.events.update((list) =>
      list.map((ev) =>
        ev.id !== e.id
          ? ev
          : {
              ...ev,
              recipes: ev.recipes.map((x) => (x.id === r.id ? { ...x, count: x.count + 1 } : x)),
            },
      ),
    );
  }

  protected dec(e: EventBlock, r: RecipeLine): void {
    this.events.update((list) =>
      list.map((ev) =>
        ev.id !== e.id
          ? ev
          : {
              ...ev,
              recipes: ev.recipes.map((x) =>
                x.id === r.id ? { ...x, count: Math.max(0, x.count - 1) } : x,
              ),
            },
      ),
    );
  }
}
