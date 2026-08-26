import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { LucideDynamicIcon, LucidePencil } from '@lucide/angular';
import { Badge, Btn, Card } from '@bae/ui';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ReferentielsStore } from '#core/store/referentiels.store';
import { selectPermissions } from '#core/store/auth/auth.selector';
import type { Permission } from '#core/models/permission.model';
import { JOB_PERIOD_LABELS, type JobPeriod } from '#core/models/job-period.model';

type Tab = 'categories' | 'suppliers' | 'jobs';

/** Chaque onglet est conditionné à sa propre lecture. */
const TABS: readonly { readonly key: Tab; readonly label: string; readonly read: Permission }[] = [
  { key: 'categories', label: 'Catégories', read: 'category:read' },
  { key: 'suppliers', label: 'Enseignes', read: 'supplier:read' },
  { key: 'jobs', label: 'Postes', read: 'job:read' },
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

  protected readonly icPencil = LucidePencil;

  private has(permission: Permission): boolean {
    return this.permissions().includes(permission);
  }

  protected readonly canWriteCategories = computed(() => this.has('category:write'));
  protected readonly canDeleteCategories = computed(() => this.has('category:delete'));
  protected readonly canWriteSuppliers = computed(() => this.has('supplier:write'));
  protected readonly canDeleteSuppliers = computed(() => this.has('supplier:delete'));
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
}
