import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideArrowRight,
  LucideBarChart3,
  LucideCheck,
  LucideDynamicIcon,
  LucideHouse,
  LucideLightbulb,
  LucideLock,
  LucideMail,
  LucidePlus,
  LucideSearch,
  LucideTicket,
  LucideTriangleAlert,
  LucideX,
  LucideZap,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn, Avatar } from '@bae/ui';

@Component({
  selector: 'bfd-etats',
  imports: [Btn, Avatar, LucideDynamicIcon],
  templateUrl: './etats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Etats {
  constructor() {
    inject(PageHeaderService).set({
      title: 'États système',
      subtitle: '6 écrans · cohérents avec la chrome principale',
      breadcrumb: ['Système', 'États'],
    });
  }

  protected readonly icHome = LucideHouse;
  protected readonly icSearch = LucideSearch;
  protected readonly icTicket = LucideTicket;
  protected readonly icLock = LucideLock;
  protected readonly icMail = LucideMail;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icCheck = LucideCheck;
  protected readonly icX = LucideX;
  protected readonly icZap = LucideZap;
  protected readonly icPlus = LucidePlus;
  protected readonly icChart = LucideBarChart3;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icLight = LucideLightbulb;

  protected readonly offlineRows: ReadonlyArray<{
    readonly ok: boolean;
    readonly l: string;
    readonly s: string;
  }> = [
    { ok: true, l: 'Recettes · liste & détail', s: 'mises en cache · 12 fév.' },
    { ok: true, l: 'Stocks · vue lecture', s: 'snapshot 13:48' },
    { ok: true, l: 'Présences · ton calendrier', s: 'à jour' },
    { ok: false, l: 'Caisse · nouvelles ventes', s: 'serveur requis' },
    { ok: false, l: 'Paiements · transactions live', s: 'serveur requis' },
  ];

  protected readonly localQueue: ReadonlyArray<readonly [string, string, string]> = [
    ['21:14', 'Hot-dog × 2 · Coca', '6,00 €'],
    ['21:13', 'Heineken 33cl', '2,50 €'],
    ['21:13', 'Pack soirée × 2', '12,50 €'],
    ['21:12', 'Crêpe sucre', '2,00 €'],
  ];
}
