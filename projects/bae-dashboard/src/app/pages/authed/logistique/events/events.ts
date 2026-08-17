import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
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
  LucideEllipse,
  LucideEllipsis,
  LucideFilter,
  LucideFunctionSquare,
  LucideFunnel,
  LucideMoreHorizontal,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { Router } from '@angular/router';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { LogistiqueAssignModal } from '#shared/components/modal/logistique-assign-modal/logistique-assign-modal';
import { EventsStore } from '#core/store/events.store';
import { RecipesStore } from '#core/store/recipes.store';
import { EventDetail, MenuItem } from '#core/models/event.model';
import type { RecipeProduct } from '#pages/authed/recettes/recipes.types';
import { ToastService, Btn, Badge, BadgeKind, Input, DropdownService, DropdownItem } from '@bae/ui';
import { PrintService } from '#core/services/print/print-service';

type TabKey = 'upcoming' | 'preparing' | 'past' | 'all';

/**
 * Les trois états affichés d'une soirée — jamais stockés, voir `statusOf()`.
 */
type SoireeState = 'past' | 'preparing' | 'planning';

const STATE_BADGE: Record<SoireeState, { readonly label: string; readonly kind: BadgeKind }> = {
  past: { label: 'Passée', kind: 'ok' },
  preparing: { label: 'En préparation', kind: 'warn' },
  planning: { label: 'À planifier', kind: 'blue' },
};

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

const WEEKDAY_FR: readonly string[] = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

@Component({
  selector: 'bfd-logistique-events',
  imports: [Btn, Badge, Input, LucideDynamicIcon],
  templateUrl: './events.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class LogistiqueEvents implements OnInit, OnDestroy {
  private readonly store = inject(EventsStore);
  private readonly recipes = inject(RecipesStore);
  private readonly dropdown = inject(DropdownService);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly modals = inject(ModalService);
  private readonly printService = inject(PrintService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  ngOnInit(): void {
    void this.store.load();
    void this.recipes.load();
  }

  constructor() {
    effect(() => {
      this.pageHeader.set({
        title: 'Logistique',
        subtitle: 'Vue par soirée · recettes & quantités',
        breadcrumb: ['Préparation', 'Logistique', 'Soirées'],
        activeNavId: 'log',
      });
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });

    effect(() => {
      for (const event of this.store.allEvents()) {
        if (event.menuStatus === 'init') void this.store.loadEventMenu(event.id);
      }
    });
  }

  ngOnDestroy(): void {
    for (const timer of this.pendingTimers.values()) clearTimeout(timer);
    this.pendingTimers.clear();
  }

  protected readonly icPlus = LucidePlus;
  protected readonly icEdit = LucidePencil;
  protected readonly icMore = LucideEllipsis;
  protected readonly icTrash = LucideTrash2;
  protected readonly icChef = LucideChefHat;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icCalendar = LucideCalendar;
  protected readonly icFilter = LucideFunnel;
  protected readonly icSearch = LucideSearch;
  protected readonly icDownload = LucideDownload;

  protected readonly activeTab = signal<TabKey>('upcoming');

  protected readonly tabs = computed(() => {
    const list = this.store.allEvents();
    const upcoming = list.filter((e) => this.statusOf(e) !== 'past').length;
    const preparing = list.filter((e) => this.statusOf(e) === 'preparing').length;
    const past = list.filter((e) => this.statusOf(e) === 'past').length;
    return [
      { key: 'upcoming' as TabKey, label: 'À venir', count: upcoming },
      { key: 'preparing' as TabKey, label: 'En préparation', count: preparing },
      { key: 'past' as TabKey, label: 'Passées', count: past },
      { key: 'all' as TabKey, label: 'Tout', count: list.length },
    ];
  });

  protected readonly visibleEvents = computed<readonly EventDetail[]>(() => {
    const tab = this.activeTab();
    const list = this.store.allEvents();
    if (tab === 'all') return list;
    if (tab === 'preparing') return list.filter((e) => this.statusOf(e) === 'preparing');
    if (tab === 'past') return list.filter((e) => this.statusOf(e) === 'past');
    return list.filter((e) => this.statusOf(e) !== 'past');
  });

  protected setTab(key: TabKey): void {
    this.activeTab.set(key);
  }

  /**
   * L'état affiché d'une soirée.
   *
   * Trois états pour une seule colonne en base. `events.status` distingue
   * `scheduled | ongoing | completed`, mais ne dit pas si la logistique a fait
   * son travail : « en préparation » veut dire « un menu existe », « à
   * planifier » veut dire « il n'y en a pas encore ». C'est dérivé, jamais
   * stocké — une colonne d'état de plus serait une vérité que rien ne tient à
   * jour.
   */
  protected statusOf(event: EventDetail): SoireeState {
    if (event.status === 'completed') return 'past';
    return (event.menu?.length ?? 0) > 0 ? 'preparing' : 'planning';
  }

  protected stateBadge(event: EventDetail): { readonly label: string; readonly kind: BadgeKind } {
    return STATE_BADGE[this.statusOf(event)];
  }

  /**
   * Coût des denrées de tout le menu, ou `null` si une seule recette a un coût
   * inconnu : additionner ce qu'on sait donnerait un chiffre faussement
   * rassurant, et la maquette affiche « — » pour ce cas.
   */
  protected menuCost(menu: readonly MenuItem[]): number | null {
    let total = 0;
    for (const line of menu) {
      if (line.totalCost === null) return null;
      total += line.totalCost;
    }
    return total;
  }

  /** Les recettes qu'on peut encore ajouter à ce menu. */
  protected availableRecipes(
    catalog: readonly RecipeProduct[],
    menu: readonly MenuItem[],
  ): readonly RecipeProduct[] {
    const taken = new Set(menu.map((line) => line.productId));
    return catalog.filter((recipe) => !taken.has(recipe.id));
  }

  protected dayOf(event: EventDetail): string {
    return event.date.getDate().toString().padStart(2, '0');
  }

  protected monthOf(event: EventDetail): string {
    return MONTH_FR[event.date.getMonth()];
  }

  /** « Ven. 19:30 — 23:00 », ou juste l'heure de début si la durée est inconnue. */
  protected whenLabel(event: EventDetail): string {
    const weekday = WEEKDAY_FR[event.date.getDay()];
    const start = event.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (event.duration == null) return `${weekday} ${start}`;
    const end = new Date(event.date.getTime() + event.duration * 1000);
    const endLabel = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${weekday} ${start} — ${endLabel}`;
  }

  protected formatPrice(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }

  protected formatPriceInt(n: number): string {
    return n.toFixed(0);
  }

  /** « — » plutôt qu'un nombre : `unitCost`/`totalCost` valent `null` dès
   *  qu'un ingrédient de la recette n'a aucun fournisseur prix. */
  protected formatPriceOrDash(n: number | null): string {
    return n === null ? '—' : `${this.formatPrice(n)} €`;
  }

  protected eventBorderClass(event: EventDetail): string {
    return this.statusOf(event) === 'preparing' ? 'border-warn' : 'border-border-s';
  }

  protected dateChipClass(event: EventDetail): string {
    return this.statusOf(event) === 'preparing'
      ? 'bg-red-soft text-red border-red'
      : 'bg-surface-2 text-text-2 border-border-s';
  }

  /**
   * Ouvre la liste de courses de la soirée.
   *
   * `/logistique/:id` existait sans qu'aucun écran n'y mène : la page était
   * inatteignable autrement qu'en tapant l'URL à la main.
   */
  protected openCourses(eventId: string): void {
    void this.router.navigate(['/logistique', eventId]);
  }

  protected printFicheLogistique(eventId: string, eventName: string): void {
    this.printService.download(
      `/events/${eventId}/shopping-list/pdf`,
      `fiche-logistique-${eventName}.pdf`,
    );
  }

  /**
   * Ouvre la modale d'assignation des recettes — l'interface prévue pour
   * composer un menu en une passe : cocher, quantifier, enregistrer.
   *
   * Le sélecteur déroulant (`openRecipePicker`) reste sur « Ajouter une
   * recette » : il sert le geste unitaire, ajouter une recette de plus à un menu
   * déjà composé, sans ouvrir toute la modale.
   */
  protected openAssign(event: EventDetail): void {
    this.modals.open({
      type: 'component',
      component: LogistiqueAssignModal,
      inputs: {
        eventId: event.id,
        eventLabel: `${event.name.toUpperCase()} · ${this.dayOf(event)}/${this.monthOf(event)}`,
      },
    });
  }

  protected openLineMenu(event: EventDetail, line: MenuItem, ev: MouseEvent): void {
    ev.stopPropagation();
    const anchor = this.resolveAnchor(ev.currentTarget);
    if (!anchor) return;

    this.dropdown.toggle({
      anchor,
      placement: 'bottom-end',
      width: 220,
      items: [
        {
          type: 'action',
          icon: this.icTrash,
          label: 'Retirer du menu',
          danger: true,
          onClick: () => void this.removeRecipe(event.id, line),
        },
      ],
    });
  }

  private resolveAnchor(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof HTMLElement)) return null;
    return target.closest('button') ?? target;
  }

  /** Ajoute la recette au menu puis confirme par un toast — même geste que les
   *  enregistrements de stocks et de bons d'achat. */
  protected async addRecipe(event: EventDetail, recipe: RecipeProduct): Promise<void> {
    await this.store.addMenuLine(event.id, recipe.id);
    const error = this.store.menuError();
    this.toast.show(
      error
        ? { type: 'error', title: 'Ajout refusé', message: error }
        : { type: 'success', title: 'Recette ajoutée', message: recipe.name },
    );
  }

  protected async removeRecipe(eventId: string, line: MenuItem): Promise<void> {
    await this.store.removeMenuLine(eventId, line.productId);
    const error = this.store.menuError();
    this.toast.show(
      error
        ? { type: 'error', title: 'Retrait refusé', message: error }
        : { type: 'success', title: 'Recette retirée', message: line.name },
    );
  }

  /**
   * Quantités en cours d'édition, indexées par `"<eventId>:<productId>"`.
   *
   * Le gabarit lit toujours `quantityOf()`, jamais `line.quantity`
   * directement : le pas-à-pas doit répondre au clic sans attendre le réseau,
   * alors que la requête, elle, est différée et coalescée.
   */
  private readonly pendingQuantities = signal<ReadonlyMap<string, number>>(new Map());
  private readonly pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private static readonly DEBOUNCE_MS = 400;

  protected quantityOf(eventId: string, line: MenuItem): number {
    return this.pendingQuantities().get(`${eventId}:${line.productId}`) ?? line.quantity;
  }

  /**
   * Le pas-à-pas est débouncé par ligne : dix clics consécutifs ne font qu'une
   * requête, avec la valeur finale. L'affichage, lui, bouge à chaque clic —
   * il vit dans `pendingQuantities`, lu en priorité par le gabarit, jamais
   * dans l'attente du réseau.
   */
  protected step(eventId: string, line: MenuItem, delta: number): void {
    const key = `${eventId}:${line.productId}`;
    const current = this.quantityOf(eventId, line);
    // Quantité 0 signifierait « retirer la ligne » — c'est le retrait qui
    // porte cette intention, pas ce pas-à-pas ; l'API refuse d'ailleurs toute
    // valeur < 1 par un 422.
    const next = Math.max(1, current + delta);
    if (next === current) return;

    this.pendingQuantities.update((map) => {
      const copy = new Map(map);
      copy.set(key, next);
      return copy;
    });

    const existing = this.pendingTimers.get(key);
    if (existing) clearTimeout(existing);

    this.pendingTimers.set(
      key,
      setTimeout(() => {
        this.pendingTimers.delete(key);
        void this.store.setMenuLineQuantity(eventId, line.productId, next).finally(() => {
          // Le store porte déjà la valeur, optimiste depuis l'appel : l'entrée
          // locale n'a plus lieu d'être, qu'il ait réussi ou échoué (le store
          // restaure alors lui-même la ligne fautive).
          this.pendingQuantities.update((map) => {
            if (!map.has(key)) return map;
            const copy = new Map(map);
            copy.delete(key);
            return copy;
          });
        });
      }, LogistiqueEvents.DEBOUNCE_MS),
    );
  }
}
