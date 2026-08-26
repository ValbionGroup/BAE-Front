import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { LucideDynamicIcon, LucidePencil, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { Badge, Btn, Card, ToastService, messageOf } from '@bae/ui';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ReferentielsStore, type WriteResult } from '#core/store/referentiels.store';
import { ModalService } from '#shared/components/modal/modal.service';
import { NamedEntityModal } from '#shared/components/modal/named-entity-modal/named-entity-modal';
import { JobEditModal } from '#shared/components/modal/job-edit-modal/job-edit-modal';
import type {
  ApiCategory,
  ApiJob,
  ApiProductCategory,
  ApiSupplier,
} from '#core/services/referentiels/referentiels-service';
import { selectPermissions } from '#core/store/auth/auth.selector';
import type { Permission } from '#core/models/permission.model';
import { JOB_PERIOD_LABELS, type JobPeriod } from '#core/models/job-period.model';

type Tab = 'categories' | 'suppliers' | 'jobs' | 'productCategories';

/**
 * Chaque onglet est conditionné à sa propre lecture.
 *
 * ⚠️ Deux d'entre eux s'appellent « Catégories » et « Catégories de recettes » —
 * trop proches pour qu'on sache lequel ouvrir. Le `hint` dit à quoi chacun sert,
 * et il est affiché : les denrées se classent pour le **stockage**, les recettes
 * pour le **menu et la caisse**.
 */
const TABS: readonly {
  readonly key: Tab;
  readonly label: string;
  readonly hint: string;
  readonly read: Permission;
}[] = [
  {
    key: 'categories',
    label: 'Catégories',
    hint: 'des denrées, pour le stockage',
    read: 'category:read',
  },
  { key: 'suppliers', label: 'Enseignes', hint: 'où l’on achète', read: 'supplier:read' },
  { key: 'jobs', label: 'Postes', hint: 'tenus pendant une soirée', read: 'job:read' },
  {
    key: 'productCategories',
    label: 'Catégories de recettes',
    hint: 'des recettes, pour le menu et la caisse',
    read: 'product:read',
  },
];

/**
 * Les trois listes de référence que le reste de l'application consomme sans
 * pouvoir les modifier : catégories de denrées, enseignes, postes.
 *
 * ⚠️ **La page s'ouvre dès qu'on porte UNE des trois lectures**
 * (`ROUTE_PERMISSIONS` accepte une liste, cf. `route-permissions.ts`). L'onglet
 * actif se choisit donc parmi ceux qu'on a le droit de voir, jamais en dur :
 * un membre qui ne porte que `job:read` atterrirait sinon sur un onglet vide.
 *
 * Les trois listes se chargent ensemble, y compris celles qu'on n'affichera
 * pas. C'est voulu : le serveur garde chaque route, un 403 sur une liste
 * masquée est sans conséquence, et conditionner le chargement compliquerait le
 * store pour rien.
 */
@Component({
  selector: 'bfd-referentiels',
  imports: [Badge, Btn, Card, LucideDynamicIcon],
  templateUrl: './referentiels.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class Referentiels implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  protected readonly store = inject(ReferentielsStore);
  private readonly permissions = inject(Store).selectSignal(selectPermissions);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);

  protected readonly icPencil = LucidePencil;
  protected readonly icPlus = LucidePlus;
  protected readonly icTrash = LucideTrash2;

  private has(permission: Permission): boolean {
    return this.permissions().includes(permission);
  }

  protected readonly canWriteCategories = computed(() => this.has('category:write'));
  protected readonly canDeleteCategories = computed(() => this.has('category:delete'));
  protected readonly canWriteSuppliers = computed(() => this.has('supplier:write'));
  protected readonly canDeleteSuppliers = computed(() => this.has('supplier:delete'));
  protected readonly canWriteProductCategories = computed(() => this.has('product:write'));
  protected readonly canDeleteProductCategories = computed(() => this.has('product:delete'));
  protected readonly canWriteJobs = computed(() => this.has('job:write'));
  protected readonly canDeleteJobs = computed(() => this.has('job:delete'));

  /** Les onglets réellement lisibles — jamais trois onglets dont deux en 403. */
  protected readonly tabs = computed(() => TABS.filter((tab) => this.has(tab.read)));

  private readonly requestedTab = signal<Tab | null>(null);

  /**
   * L'onglet demandé s'il est lisible, sinon le premier qui l'est. Dérivé et non
   * stocké : un onglet actif figé sur « Catégories » afficherait du vide à qui
   * ne porte que `job:read`.
   */
  protected readonly activeTab = computed<Tab | null>(() => {
    const readable = this.tabs();
    const requested = this.requestedTab();
    if (requested !== null && readable.some((tab) => tab.key === requested)) return requested;
    return readable[0]?.key ?? null;
  });

  /** Le sous-titre de l'onglet ouvert, qui dit à quoi il sert. */
  protected readonly activeHint = computed(
    () => this.tabs().find((tab) => tab.key === this.activeTab())?.hint ?? '',
  );

  protected setTab(tab: Tab): void {
    this.requestedTab.set(tab);
  }

  /** ⚠️ `JOB_PERIOD_LABELS` est la source unique du vocabulaire des périodes —
   *  le modèle interdit explicitement de redéclarer ces chaînes ailleurs. */
  protected periodLabel(type: JobPeriod): string {
    return JOB_PERIOD_LABELS[type] ?? type;
  }

  constructor() {
    this.pageHeader.set({
      title: 'Référentiels',
      subtitle: "Les listes que le reste de l'application consomme",
      breadcrumb: ['Préparation', 'Référentiels'],
      activeNavId: 'ref',
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  // ————— Écritures —————

  /** Ouvre la modale « entité nommée » pour une création ou un renommage. */
  private openNamed(
    title: string,
    placeholder: string,
    initial: string,
    save: (name: string) => Promise<WriteResult>,
  ): void {
    this.modal.open({
      type: 'component',
      component: NamedEntityModal,
      inputs: { title, placeholder, initial, save, onDone: () => this.announceSaved() },
    });
  }

  private announceSaved(): void {
    this.toast.show({ type: 'success', title: 'Enregistré' });
  }

  protected createCategory(): void {
    this.openNamed('Nouvelle catégorie', 'ex. Surgelés', '', (name) =>
      this.store.createCategory(name),
    );
  }

  protected editCategory(category: ApiCategory): void {
    this.openNamed('Modifier la catégorie', '', category.name, (name) =>
      this.store.updateCategory(category.id, name),
    );
  }

  protected createSupplier(): void {
    this.openNamed('Nouvelle enseigne', 'ex. Metro', '', (name) => this.store.createSupplier(name));
  }

  protected editSupplier(supplier: ApiSupplier): void {
    this.openNamed('Modifier l’enseigne', '', supplier.name, (name) =>
      this.store.updateSupplier(supplier.id, name),
    );
  }

  protected createProductCategory(): void {
    this.openNamed('Nouvelle catégorie de recettes', 'ex. Desserts', '', (name) =>
      this.store.createProductCategory(name),
    );
  }

  protected editProductCategory(category: ApiProductCategory): void {
    this.openNamed('Modifier la catégorie', '', category.name, (name) =>
      this.store.updateProductCategory(category.id, name),
    );
  }

  protected confirmDeleteProductCategory(category: ApiProductCategory): void {
    this.modal.open({
      type: 'delete',
      title: 'Supprimer la catégorie de recettes',
      message: `« ${category.name} » sera retirée de la liste.`,
      details:
        category.productsCount > 0
          ? `${category.productsCount} recette(s) deviendront sans catégorie. Elles ne sont pas supprimées.`
          : 'Aucune recette n’y est classée.',
      onConfirm: () => void this.deleteProductCategory(category.id, category.name),
    });
  }

  protected async deleteProductCategory(id: number, name: string): Promise<void> {
    this.report(
      await this.store.deleteProductCategory(id),
      `« ${name} » n’est plus dans la liste.`,
    );
  }

  protected createJob(): void {
    this.modal.open({
      type: 'component',
      component: JobEditModal,
      inputs: { job: null, onDone: () => this.announceSaved() },
    });
  }

  protected editJob(job: ApiJob): void {
    this.modal.open({
      type: 'component',
      component: JobEditModal,
      inputs: { job, onDone: () => this.announceSaved() },
    });
  }

  // ————— Suppressions —————

  /**
   * ⚠️ Chaque `details` dit ce que la suppression rencontrera. Les trois cas
   * diffèrent, et c'est tout le propos de cet écran :
   *
   * - une **catégorie** déclasse ses denrées (`SET NULL`), elle n'en perd aucune ;
   * - une **enseigne** est refusée si des bons d'achat ou des prix y sont
   *   rattachés — le serveur ne cède pas, la FK est en CASCADE derrière ;
   * - un **poste** est refusé s'il est demandé par une soirée, classé dans les
   *   vœux d'un membre, ou tenu sur une soirée consolidée.
   */
  protected confirmDeleteCategory(category: ApiCategory): void {
    this.modal.open({
      type: 'delete',
      title: 'Supprimer la catégorie',
      message: `« ${category.name} » sera retirée de la liste.`,
      details:
        category.goodsCount > 0
          ? `${category.goodsCount} denrée(s) deviendront sans catégorie. Elles ne sont pas supprimées.`
          : 'Aucune denrée n’y est classée.',
      onConfirm: () => void this.deleteCategory(category.id, category.name),
    });
  }

  protected async deleteCategory(id: number, name: string): Promise<void> {
    this.report(await this.store.deleteCategory(id), `« ${name} » n’est plus dans la liste.`);
  }

  protected confirmDeleteSupplier(supplier: ApiSupplier): void {
    this.modal.open({
      type: 'delete',
      title: 'Supprimer l’enseigne',
      message: `« ${supplier.name} » sera retirée de la liste.`,
      details: 'Refusé si des bons d’achat ou des prix y sont rattachés.',
      onConfirm: () => void this.deleteSupplier(supplier.id, supplier.name),
    });
  }

  protected async deleteSupplier(id: number, name: string): Promise<void> {
    this.report(await this.store.deleteSupplier(id), `« ${name} » n’est plus dans la liste.`);
  }

  protected confirmDeleteJob(job: ApiJob): void {
    this.modal.open({
      type: 'delete',
      title: 'Supprimer le poste',
      message: `« ${job.name} » sera retiré de la liste.`,
      details:
        'Refusé si une soirée en a besoin, si un membre l’a classé dans ses vœux, ou s’il a été tenu sur une soirée consolidée.',
      onConfirm: () => void this.deleteJob(job.id, job.name),
    });
  }

  protected async deleteJob(id: number, name: string): Promise<void> {
    this.report(await this.store.deleteJob(id), `« ${name} » n’est plus dans la liste.`);
  }

  /**
   * ⚠️ Le refus du serveur est **montré**, jamais avalé : sans lui, le bouton
   * semblerait ne rien faire et l'opérateur conclurait à une panne.
   */
  private report(result: WriteResult, success: string): void {
    if (result.ok) {
      this.toast.show({ type: 'success', title: 'Supprimé', message: success });
      return;
    }
    this.toast.show({
      type: 'error',
      title: 'Suppression refusée',
      message: messageOf(result.error, 'La suppression a échoué.'),
    });
  }
}
