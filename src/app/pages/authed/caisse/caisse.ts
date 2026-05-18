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
import { Router } from '@angular/router';
import {
  LucideArrowRight,
  LucideCheck,
  LucideDynamicIcon,
  LucideEuro,
  LucideLock,
  LucideQrCode,
  LucideScanLine,
  LucideSearch,
  LucideShoppingCart,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Kbd } from '#shared/components/ui/kbd/kbd';

interface Item {
  readonly n: string;
  readonly p: number;
  readonly c: string;
  readonly tag?: 'best' | 'pop' | 'new';
}

interface CartItem {
  readonly n: string;
  readonly q: number;
  readonly p: number;
}

@Component({
  selector: 'bfd-caisse',
  imports: [Btn, Badge, Kbd, LucideDynamicIcon],
  templateUrl: './caisse.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Caisse {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Caisse',
      subtitle: 'Soirée Hivernale · Service en cours · 21:14',
      breadcrumb: ['Soirée', 'Caisse'],
      activeNavId: 'cmd',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected openCloture(): void {
    this.router.navigate(['/caisse/cloture']);
  }

  protected readonly icUser = LucideUser;
  protected readonly icScan = LucideScanLine;
  protected readonly icSearch = LucideSearch;
  protected readonly icCart = LucideShoppingCart;
  protected readonly icCheck = LucideCheck;
  protected readonly icX = LucideX;
  protected readonly icEuro = LucideEuro;
  protected readonly icQr = LucideQrCode;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icLock = LucideLock;

  protected readonly cats = ['Hot-dogs', 'Boissons', 'Snacks', 'Desserts'];
  protected readonly activeCat = signal(0);

  protected readonly items: readonly Item[] = [
    { n: 'Hot-dog classique', p: 3.5, c: 'Hot-dogs', tag: 'best' },
    { n: 'Hot-dog moutarde', p: 3.5, c: 'Hot-dogs' },
    { n: 'Hot-dog fromage', p: 4.0, c: 'Hot-dogs' },
    { n: 'Hot-dog veggie', p: 4.0, c: 'Hot-dogs' },
    { n: 'Heineken 33cl', p: 2.5, c: 'Boissons', tag: 'pop' },
    { n: 'Kronenbourg 50cl', p: 3.5, c: 'Boissons' },
    { n: 'Coca 33cl', p: 1.5, c: 'Boissons' },
    { n: 'Eau plate 50cl', p: 1.0, c: 'Boissons' },
    { n: 'Soft maison', p: 2.0, c: 'Boissons', tag: 'new' },
    { n: 'Frites', p: 2.5, c: 'Snacks' },
    { n: 'Frites maxi', p: 3.5, c: 'Snacks' },
    { n: 'Crêpe sucre', p: 2.0, c: 'Desserts' },
  ];

  protected readonly cart = signal<readonly CartItem[]>([
    { n: 'Hot-dog classique', q: 2, p: 3.5 },
    { n: 'Hot-dog fromage', q: 1, p: 4.0 },
    { n: 'Heineken 33cl', q: 3, p: 2.5 },
    { n: 'Frites', q: 1, p: 2.5 },
  ]);

  protected readonly subtotal = computed(() => this.cart().reduce((s, it) => s + it.q * it.p, 0));
  protected readonly remise = 1.5;
  protected readonly total = computed(() => this.subtotal() - this.remise);

  protected itemsInCat(c: string): number {
    return this.items.filter((x) => x.c === c).length;
  }

  protected formatPrice(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }

  protected isLowStock(name: string): boolean {
    return name === 'Hot-dog fromage';
  }

  protected isOut(name: string): boolean {
    return name === 'Crêpe sucre';
  }

  protected tagBgClass(tag: Item['tag']): string {
    return tag === 'best'
      ? 'bg-red text-white'
      : tag === 'pop'
        ? 'bg-blue-soft text-blue'
        : 'bg-warn-soft text-warn';
  }

  protected tagLabel(tag: Item['tag']): string {
    return tag === 'best' ? '★ TOP' : tag === 'pop' ? 'Populaire' : 'Nouveau';
  }
}
