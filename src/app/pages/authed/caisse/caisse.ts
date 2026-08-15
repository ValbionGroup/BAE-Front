import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendarPlus,
  LucideDynamicIcon,
  LucideEuro,
  LucideLock,
  LucideQrCode,
  LucideScanLine,
  LucideSearch,
  LucideShoppingCart,
  LucideX,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { CaisseStore } from '#core/store/caisse.store';
import { EventsStore } from '#core/store/events.store';
import { MenuItem } from '#core/models/event.model';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Kbd } from '#shared/components/ui/kbd/kbd';
import { formatCents } from '#shared/utils/money';

@Component({
  selector: 'bfd-caisse',
  imports: [Btn, Badge, Kbd, LucideDynamicIcon],
  templateUrl: './caisse.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Caisse implements OnInit {
  protected readonly store = inject(CaisseStore);
  private readonly events = inject(EventsStore);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    effect(() => {
      const session = this.store.sessionEvent();
      this.pageHeader.set({
        title: 'Caisse',
        subtitle: session ? `${session.name} · Service en cours` : 'Aucune session en cours',
        breadcrumb: ['Soirée', 'Caisse'],
        activeNavId: 'cmd',
      });
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  ngOnInit(): void {
    void this.events.load();
  }

  protected startSession(): void {
    const today = this.store.todayEvent();
    if (!today) return;
    this.store.startSession(today.id);
  }

  protected openCloture(): void {
    void this.router.navigate(['/caisse/cloture']);
  }

  protected onCategoryClick(category: string): void {
    const current = this.store.activeCategory();
    this.store.setActiveCategory(current === category ? null : category);
  }

  protected addItem(item: MenuItem): void {
    this.store.addToCart(item);
  }

  protected readonly formatCents = formatCents;

  protected readonly icScan = LucideScanLine;
  protected readonly icSearch = LucideSearch;
  protected readonly icCart = LucideShoppingCart;
  protected readonly icX = LucideX;
  protected readonly icEuro = LucideEuro;
  protected readonly icQr = LucideQrCode;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icLock = LucideLock;
  protected readonly icCalendarPlus = LucideCalendarPlus;
}
