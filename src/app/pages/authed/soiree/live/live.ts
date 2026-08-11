import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { LucideBell, LucideLock, LucideScanLine } from '@lucide/angular';
import { Router } from '@angular/router';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { EventsStore } from '#core/store/events.store';
import {
  ProductionService,
  type ProductionLine,
} from '#core/services/production/production-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { ProductionRunModal } from '#shared/components/modal/production-run-modal/production-run-modal';
import { ProductionReturnModal } from '#shared/components/modal/production-return-modal/production-return-modal';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';

/**
 * Pilotage d'une soirée en service.
 *
 * ⚠️ **Cette page portait une maquette entière en données inventées** : file de
 * tickets à trois colonnes, KPIs d'encaissement, cadence, flux de transactions,
 * alertes et stock critique — plus de 400 lignes qui ne consommaient aucun
 * endpoint. Tout a été supprimé le 2026-08-11. Ce qui reste est branché.
 *
 * Ce qu'il faudra rebrancher, quand le back existera : la file de commandes et
 * les KPIs supposent `orders`, qui n'a **aucun contrôleur** (§3.4 du HANDOFF) ;
 * le stock critique supposerait un seuil par denrée, qui n'existe pas non plus.
 * La maquette Claude Design (`screen-soiree-live.jsx`) reste la spécification
 * d'interface à reprendre le moment venu.
 *
 * Sur le défilement : `host: { class: 'block h-full' }` n'est pas décoratif. Un
 * composant Angular est un élément inline sans dimension propre — sans lui, le
 * `h-full` du gabarit ne résout rien et c'est le conteneur de l'app-shell qui
 * défile en écrasant le contenu. Piège documenté au §1 du HANDOFF, qui a mordu
 * deux fois.
 */
@Component({
  selector: 'bfd-soiree-live',
  imports: [Btn, Badge],
  templateUrl: './live.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class SoireeLive implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');
  private readonly destroyRef = inject(DestroyRef);

  private readonly events = inject(EventsStore);
  private readonly production = inject(ProductionService);
  private readonly modal = inject(ModalService);

  protected readonly icBell = LucideBell;
  protected readonly icScan = LucideScanLine;
  protected readonly icLock = LucideLock;

  /**
   * La soirée que cette page pilote — `EventsStore.activeEvent`, la **même** que
   * celle sur laquelle la caisse s'ouvre. Deux dérivations séparées finiraient
   * par diverger, et on encaisserait sur une soirée pendant qu'on produirait
   * pour une autre.
   */
  protected readonly currentEvent = this.events.activeEvent;

  /**
   * ⚠️ **L'effect dépend de cet identifiant, jamais de `currentEvent()`.**
   *
   * `loadEventMenu()` fait un `patchState` sur le dictionnaire dont
   * `activeEvent` dérive : un effect qui lirait l'objet se réveillerait à chaque
   * chargement de menu et le relancerait. Une chaîne, elle, reste égale à
   * elle-même quand le dictionnaire est remplacé.
   */
  protected readonly currentEventId = this.events.activeEventId;

  protected readonly productionLines = signal<readonly ProductionLine[]>([]);
  protected readonly productionStatus = signal<'init' | 'loading' | 'loaded' | 'error'>('init');

  /** L'horloge du comptoir. La seule donnée temps réel de cette page. */
  protected readonly now = signal<number>(Date.now());

  protected readonly wallClock = computed(() =>
    new Date(this.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  );

  /** L'heure de début, lue sur la soirée — plus jamais une constante. */
  protected readonly startsAt = computed(() => {
    const date = this.currentEvent()?.date;
    if (!date || Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  });

  protected readonly totalPlanned = computed(() =>
    this.productionLines().reduce((sum, line) => sum + line.plannedQty, 0),
  );

  protected readonly totalProduced = computed(() =>
    this.productionLines().reduce((sum, line) => sum + line.producedQty, 0),
  );

  ngOnInit(): void {
    void this.events.load();
  }

  /**
   * Recharge les compteurs après un lancement ou une clôture.
   *
   * L'identifiant est passé explicitement depuis l'effect : le relire ici
   * ajouterait la dépendance que l'on vient précisément d'éviter.
   */
  protected async refreshProduction(eventId?: string): Promise<void> {
    const id = eventId ?? this.currentEventId();
    if (!id) return;
    this.productionStatus.set('loading');
    try {
      this.productionLines.set(await lastValueFrom(this.production.getRuns(id)));
      this.productionStatus.set('loaded');
    } catch {
      // Un 403 est le cas courant : la lecture exige `stock:read`. Le panneau le
      // dit, il ne vide pas la page.
      this.productionLines.set([]);
      this.productionStatus.set('error');
    }
  }

  protected openRun(line: ProductionLine): void {
    const event = this.currentEvent();
    if (!event) return;
    this.modal.open({
      type: 'component',
      component: ProductionRunModal,
      inputs: {
        eventId: event.id,
        productId: line.productId,
        productName: line.productName,
        plannedQty: line.plannedQty,
        producedQty: line.producedQty,
        onDone: () => void this.refreshProduction(),
      },
    });
  }

  protected closeNight(): void {
    const event = this.currentEvent();
    if (!event) return;
    this.modal.open({
      type: 'component',
      component: ProductionReturnModal,
      inputs: {
        eventId: event.id,
        eventName: event.name,
        onDone: () => {
          void this.refreshProduction();
          this.router.navigate(['/soiree/bilan']);
        },
      },
    });
  }

  protected openCaisse(): void {
    void this.router.navigate(['/caisse']);
  }

  protected progressPercent(line: ProductionLine): number {
    if (line.plannedQty <= 0) return 0;
    return Math.min(100, (line.producedQty / line.plannedQty) * 100);
  }

  constructor() {
    this.pageHeader.set({
      title: 'Soirée · vue live',
      subtitle: 'Production du service',
      breadcrumb: ['Soirée', 'Pilotage live'],
      activeNavId: 'soir',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });

    effect(() => {
      const id = this.currentEventId();
      if (!id) return;
      untracked(() => {
        void this.events.loadEventMenu(id);
        void this.refreshProduction(id);
      });
    });

    const interval = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }
}
