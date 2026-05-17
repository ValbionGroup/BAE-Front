import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import {
  LucideCalendar,
  LucideCheck,
  LucideChevronDown,
  LucideDynamicIcon,
  LucidePencil,
  LucidePlus,
  LucideScanLine,
  LucideSettings,
  LucideTriangleAlert,
  LucideX,
  LucideZap,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { ModalService } from '#shared/components/modal/modal.service';
import { ScannerUnknownModal } from '#shared/components/modal/scanner-unknown-modal/scanner-unknown-modal';

interface ScannedItem {
  readonly n: string;
  readonly code: string;
  readonly q: string;
  readonly dlc: string;
  readonly unknown: boolean;
}

@Component({
  selector: 'bfd-stocks-scanner',
  imports: [Btn, Badge, Field, Input, LucideDynamicIcon],
  templateUrl: './scanner.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StocksScanner {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly modals = inject(ModalService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Stocks',
      subtitle: 'Scanner · ajout rapide en lot',
      breadcrumb: ['Préparation', 'Stocks', 'Scanner'],
      activeNavId: 'stocks',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icScan = LucideScanLine;
  protected readonly icX = LucideX;
  protected readonly icSettings = LucideSettings;
  protected readonly icZap = LucideZap;
  protected readonly icEdit = LucidePencil;
  protected readonly icCheck = LucideCheck;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icCalendar = LucideCalendar;
  protected readonly icChevDown = LucideChevronDown;
  protected readonly icPlus = LucidePlus;

  protected readonly history: readonly ScannedItem[] = [
    { n: 'Pains hot-dog x12', code: '3 168 421 988 011', q: '6', dlc: '20/02', unknown: false },
    { n: 'Moutarde Amora 270g', code: '8 712 100 712 408', q: '2', dlc: '08/2026', unknown: false },
    { n: 'Frites surgelées 1kg', code: '3 256 211 905 117', q: '5', dlc: '04/2027', unknown: false },
    { n: 'Produit inconnu', code: '4 102 884 002 110', q: '—', dlc: '—', unknown: true },
  ];

  protected openUnknown(barcode = '4 102 884 002 110'): void {
    this.modals.open({
      type: 'component',
      component: ScannerUnknownModal,
      inputs: { barcode },
    });
  }
}
