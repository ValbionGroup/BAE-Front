import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideCheck,
  LucideDownload,
  LucideDynamicIcon,
  LucideTicket,
} from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

interface Statistic {
  readonly l: string;
  readonly v: string;
  readonly accent: boolean;
}

interface StoreSplit {
  readonly e: string;
  readonly items: number;
  readonly total: number;
  readonly frac: number;
  readonly cls: string;
}

interface Person {
  readonly n: string;
  sel: boolean;
}

@Component({
  selector: 'bfd-logistique-generate-modal',
  imports: [Btn, Avatar, Field, Input, ModalShell, LucideDynamicIcon],
  templateUrl: './logistique-generate-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogistiqueGenerateModal {
  readonly id = input.required<string>();

  private readonly modalService = inject(ModalService);

  protected readonly icCheck = LucideCheck;
  protected readonly icDownload = LucideDownload;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icCalendar = LucideCalendar;
  protected readonly icTicket = LucideTicket;

  protected readonly stats: readonly Statistic[] = [
    { l: 'Produits', v: '24', accent: false },
    { l: 'Coût estimé', v: '187,40 €', accent: false },
    { l: 'Économie', v: '−12,80 €', accent: true },
  ];

  protected readonly splits: readonly StoreSplit[] = [
    { e: 'Leclerc Bordeaux Lac', items: 18, total: 142.3, frac: 76, cls: 'bg-ok' },
    { e: 'Auchan Mériadeck', items: 4, total: 28.4, frac: 15, cls: 'bg-blue' },
    { e: 'Carrefour Talence', items: 2, total: 16.7, frac: 9, cls: 'bg-warn' },
  ];

  protected readonly people = signal<readonly Person[]>([
    { n: 'Maxime D.', sel: true },
    { n: 'Léa M.', sel: false },
    { n: 'Hugo L.', sel: false },
    { n: 'Tom B.', sel: false },
  ]);

  protected togglePerson(n: string): void {
    this.people.update((arr) => arr.map((p) => (p.n === n ? { ...p, sel: !p.sel } : p)));
  }

  protected close(): void {
    this.modalService.close(this.id());
  }

  protected fmt(v: number): string {
    return v.toFixed(2).replace('.', ',');
  }
}
