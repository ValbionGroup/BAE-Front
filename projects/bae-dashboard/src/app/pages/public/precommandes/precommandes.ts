import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  LucideArrowRight,
  LucideClock,
  LucideDynamicIcon,
  LucideQrCode,
  LucideShield,
  LucideUser,
} from '@lucide/angular';
import { Logo } from '#shared/components/ui/logo/logo';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';

interface EventCard {
  readonly d: string;
  readonly m: string;
  readonly n: string;
  readonly s: string;
  readonly avail: number;
  readonly total: number;
  readonly hot: boolean;
  readonly soon: boolean;
}

interface MenuItem {
  readonly name: string;
  readonly desc: string;
  readonly priceOriginal: number;
  readonly priceAdh: number;
  readonly qty: number;
}

interface MenuSection {
  readonly c: string;
  readonly items: readonly MenuItem[];
}

@Component({
  selector: 'bfd-precommandes',
  imports: [Logo, Btn, Badge, Card, LucideDynamicIcon],
  templateUrl: './precommandes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Precommandes {
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icShield = LucideShield;
  protected readonly icQr = LucideQrCode;
  protected readonly icClock = LucideClock;
  protected readonly icUser = LucideUser;
  protected readonly publicNav = ['Soirées', 'Menus', 'FAQ', 'Contact'];

  protected readonly events: readonly EventCard[] = [
    {
      d: '14',
      m: 'FÉV',
      n: 'Soirée Hivernale',
      s: 'Hot-dogs, bières, crêpes',
      avail: 83,
      total: 150,
      hot: true,
      soon: false,
    },
    {
      d: '07',
      m: 'MAR',
      n: 'Carnaval BAE',
      s: 'Tapas & sangria',
      avail: 120,
      total: 120,
      hot: false,
      soon: true,
    },
    {
      d: '28',
      m: 'MAR',
      n: 'Repas Alternants',
      s: 'Pâtes carbonara',
      avail: 0,
      total: 80,
      hot: false,
      soon: false,
    },
  ];

  protected readonly menu: readonly MenuSection[] = [
    {
      c: 'Hot-dogs',
      items: [
        {
          name: 'Hot-dog classique',
          desc: 'Saucisse Strasbourg · oignons · moutarde',
          priceOriginal: 3.5,
          priceAdh: 3.0,
          qty: 2,
        },
        {
          name: 'Hot-dog fromage',
          desc: 'Saucisse Strasbourg · cheddar · oignons',
          priceOriginal: 4.0,
          priceAdh: 3.5,
          qty: 0,
        },
        {
          name: 'Hot-dog veggie',
          desc: 'Saucisse végétale · oignons · ketchup',
          priceOriginal: 4.0,
          priceAdh: 3.5,
          qty: 0,
        },
      ],
    },
    {
      c: 'Boissons',
      items: [
        {
          name: 'Heineken 33cl',
          desc: 'Bière blonde · 5%',
          priceOriginal: 2.5,
          priceAdh: 2.0,
          qty: 3,
        },
        {
          name: 'Kronenbourg 50cl',
          desc: 'Bière blonde · 4,2%',
          priceOriginal: 3.5,
          priceAdh: 3.0,
          qty: 0,
        },
        { name: 'Coca-Cola 33cl', desc: 'Canette', priceOriginal: 1.5, priceAdh: 1.5, qty: 0 },
      ],
    },
  ];

  protected readonly subtotal = signal(12.0);
  protected readonly remise = signal(2.0);

  protected formatPrice(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }

  protected total(): number {
    return this.subtotal() - this.remise();
  }

  protected availPct(e: EventCard): number {
    return e.total > 0 ? (e.avail / e.total) * 100 : 0;
  }
}
