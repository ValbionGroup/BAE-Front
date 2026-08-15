import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  effect,
  inject,
  signal,
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
  LucideCheck,
  LucideUser,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { CaisseStore } from '#core/store/caisse.store';
import { EventsStore } from '#core/store/events.store';
import { MenuItem } from '#core/models/event.model';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Kbd } from '#shared/components/ui/kbd/kbd';
import { formatCents } from '#shared/utils/money';
import { ModalService } from '#shared/components/modal/modal.service';
import { PaymentModal, type PaymentMethod } from '#shared/components/modal/payment-modal/payment-modal';
import { BuyerPicker } from '#shared/components/buyer-picker/buyer-picker';
import { CheckoutFeedback } from './checkout-feedback/checkout-feedback';
import type { Buyer } from '#core/services/buyers/buyers-service';

@Component({
  selector: 'bfd-caisse',
  imports: [Btn, Badge, Kbd, LucideDynamicIcon, BuyerPicker, CheckoutFeedback],
  templateUrl: './caisse.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Caisse implements OnInit {
  protected readonly store = inject(CaisseStore);
  private readonly events = inject(EventsStore);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly modalService = inject(ModalService);
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

  /** « cotisation valide jusqu'au … » de la maquette, alimenté par le fast pass. */
  protected fastPassLabel(buyer: Buyer): string | null {
    if (!buyer.fastPass) return null;
    const until = new Date(buyer.fastPass.validUntil).toLocaleDateString('fr-FR');
    return `${buyer.fastPass.label} · valide jusqu'au ${until}`;
  }

  protected readonly pickingBuyer = signal(false);

  protected onBuyerPicked(buyer: Buyer): void {
    this.store.setBuyer(buyer);
    this.pickingBuyer.set(false);
  }

  /** Le choix du moyen de paiement précède l'encaissement, il ne le suit pas. */
  protected openPayment(): void {
    if (this.store.itemCount() === 0) return;

    this.modalService.open({
      type: 'component',
      component: PaymentModal,
      inputs: {
        totalCents: this.store.subtotal(),
        clientName: this.store.selectedBuyer()?.name ?? 'Anonyme',
        onConfirm: (method: PaymentMethod) => this.checkout(method),
      },
    });
  }

  /** Le bandeau de confirmation porte le retour : pas de toast en doublon. */
  private async checkout(method: PaymentMethod): Promise<void> {
    await this.store.checkout(method);
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
  protected readonly icCheck = LucideCheck;
  protected readonly icUser = LucideUser;
  protected readonly icEuro = LucideEuro;
  protected readonly icQr = LucideQrCode;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icLock = LucideLock;
  protected readonly icCalendarPlus = LucideCalendarPlus;
}
