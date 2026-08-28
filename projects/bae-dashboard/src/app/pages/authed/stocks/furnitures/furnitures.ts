import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { LucideBoxes, LucideDynamicIcon, LucideEuro, LucidePackageMinus } from '@lucide/angular';
import {
  Badge,
  Btn,
  Card,
  Checkbox,
  DetailSheet,
  Input,
  ToastService,
  formatCents,
  messageOf,
} from '@bae/ui';
import { FurnituresStore } from '#core/store/furnitures.store';
import type { ApiFurniture } from '#core/services/furnitures/furnitures-service';
import { selectPermissions } from '#core/store/auth/auth.selector';
import type { Permission } from '#core/models/permission.model';
import { ModalService } from '#shared/components/modal/modal.service';
import { FurnitureEditModal } from '#shared/components/modal/furniture-edit-modal/furniture-edit-modal';

type FurnitureSortKey = 'name' | 'quantity' | 'price' | 'value';
type SortDir = 'asc' | 'desc';

/**
 * Le catalogue **non alimentaire**, moitié gauche et panneau de détail de la
 * page Stocks quand la bascule est sur « Non alimentaire ».
 *
 * Un composant à part, et non une branche de plus dans `stocks.ts` : cette page
 * est bâtie autour des **lots** — colonnes DLC, panneau de lots, KPIs de
 * péremption, toggle des lots vides. Une fourniture n'a rien de tout cela, et
 * les deux tableaux ne partagent pas une colonne.
 *
 * ⚠️ L'hôte est en `contents` : la grille à deux pistes appartient au parent,
 * et une boîte intermédiaire ferait tomber la liste et le panneau dans la même
 * colonne.
 */
@Component({
  selector: 'bfd-furnitures',
  imports: [Badge, Btn, Card, Checkbox, Input, DetailSheet, LucideDynamicIcon],
  templateUrl: './furnitures.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Furnitures {
  protected readonly store = inject(FurnituresStore);
  private readonly permissions = inject(Store).selectSignal(selectPermissions);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);

  protected readonly icBoxes = LucideBoxes;
  protected readonly icEuro = LucideEuro;
  protected readonly icEmpty = LucidePackageMinus;

  protected readonly formatCents = formatCents;

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;

  protected readonly searchQuery = signal('');
  protected readonly sortKey = signal<FurnitureSortKey>('name');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly selectedIds = signal<ReadonlySet<number>>(new Set<number>());

  constructor() {
    void this.store.load();
  }

  private has(permission: Permission): boolean {
    return this.permissions().includes(permission);
  }

  protected readonly canWrite = computed(() => this.has('furniture:write'));
  protected readonly canDelete = computed(() => this.has('furniture:delete'));

  /** Ce que vaut une ligne en stock, en centimes. */
  protected value(item: ApiFurniture): number {
    return item.quantity * item.price;
  }

  protected readonly visible = computed<readonly ApiFurniture[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    const list = query
      ? this.store.items().filter((item) => item.name.toLowerCase().includes(query))
      : [...this.store.items()];

    return [...list].sort((a, b) => {
      switch (key) {
        case 'quantity':
          return (a.quantity - b.quantity) * dir;
        case 'price':
          return (a.price - b.price) * dir;
        case 'value':
          return (this.value(a) - this.value(b)) * dir;
        default:
          return a.name.localeCompare(b.name, 'fr') * dir;
      }
    });
  });

  protected readonly selected = computed<ApiFurniture | null>(() => {
    const id = this.selectedId();
    return id === null ? null : (this.store.items().find((item) => item.id === id) ?? null);
  });

  protected readonly kpis = computed(() => {
    const items = this.store.items();
    const empty = items.filter((item) => item.quantity === 0).length;
    const total = items.reduce((sum, item) => sum + this.value(item), 0);

    return [
      { label: 'Références', value: String(items.length), icon: this.icBoxes, colorClass: '' },
      {
        label: 'En rupture',
        value: String(empty),
        icon: this.icEmpty,
        colorClass: empty > 0 ? 'text-warn' : '',
      },
      {
        label: 'Valeur du stock',
        value: `${formatCents(total)} €`,
        icon: this.icEuro,
        colorClass: '',
      },
    ];
  });

  protected readonly allSelected = computed(() => {
    const visible = this.visible();
    const ids = this.selectedIds();
    return visible.length > 0 && visible.every((item) => ids.has(item.id));
  });

  protected readonly someSelected = computed(() =>
    this.visible().some((item) => this.selectedIds().has(item.id)),
  );

  protected setSearch(value: string): void {
    this.searchQuery.set(value);
  }

  /** Un second clic sur la même colonne inverse le sens, comme sur les denrées. */
  protected setSort(key: FurnitureSortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    this.sortDir.set('asc');
  }

  protected select(id: number): void {
    this.selectedId.update((current) => (current === id ? null : id));
  }

  protected toggleSelect(id: number): void {
    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected toggleAll(): void {
    const all = this.allSelected();
    this.selectedIds.set(all ? new Set<number>() : new Set(this.visible().map((item) => item.id)));
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set<number>());
  }

  protected openEditor(furniture: ApiFurniture | null): void {
    this.modal.open({
      type: 'component',
      component: FurnitureEditModal,
      inputs: { furniture },
    });
  }

  protected confirmDelete(furniture: ApiFurniture): void {
    this.modal.open({
      type: 'delete',
      title: 'Supprimer la fourniture',
      message: `« ${furniture.name} » quittera le catalogue.`,
      details: 'Les recettes qui l’utilisent la perdront de leur composition.',
      onConfirm: () => void this.remove([furniture]),
    });
  }

  protected confirmDeleteSelection(): void {
    const items = this.store.items().filter((item) => this.selectedIds().has(item.id));
    if (items.length === 0) return;

    this.modal.open({
      type: 'delete',
      title: `Supprimer ${items.length} fourniture${items.length !== 1 ? 's' : ''}`,
      message: items.map((item) => item.name).join(', '),
      details: 'Les recettes qui les utilisent les perdront de leur composition.',
      onConfirm: () => void this.remove(items),
    });
  }

  /**
   * Les suppressions partent **en série** : le magasin relit la liste après
   * chacune, et les paralléliser ferait autant de `GET /furnitures`
   * concurrents dont le dernier arrivé gagnerait.
   */
  private async remove(items: readonly ApiFurniture[]): Promise<void> {
    const failed: string[] = [];
    for (const item of items) {
      const result = await this.store.remove(item.id);
      if (!result.ok)
        failed.push(messageOf(result.error, `« ${item.name} » n’a pas pu être supprimée.`));
    }

    this.selectedIds.set(new Set<number>());
    if (this.selected() === null) this.selectedId.set(null);

    if (failed.length > 0) {
      this.toast.show({ type: 'error', title: 'Suppression refusée', message: failed[0] });
      return;
    }
    this.toast.show({
      type: 'success',
      title: items.length > 1 ? 'Fournitures supprimées' : 'Fourniture supprimée',
      message: items.map((item) => item.name).join(', '),
    });
  }
}
