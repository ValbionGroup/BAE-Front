import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideCheck,
  LucideChefHat,
  LucideChevronDown,
  LucideClock,
  LucideDynamicIcon,
  LucideFlame,
  LucideIconInput,
  LucideLock,
  LucideStar,
} from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

type TypeKey = 'pub' | 'repas' | 'event' | 'priv';

interface TypeOption {
  readonly key: TypeKey;
  readonly l: string;
  readonly desc: string;
  readonly icon: LucideIconInput;
}

@Component({
  selector: 'bfd-coordination-new-modal',
  imports: [Btn, Avatar, Field, Input, ModalShell, LucideDynamicIcon],
  templateUrl: './coordination-new-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationNewModal {
  readonly id = input.required<string>();

  private readonly modalService = inject(ModalService);

  protected readonly icCalendar = LucideCalendar;
  protected readonly icClock = LucideClock;
  protected readonly icCheck = LucideCheck;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icChevDown = LucideChevronDown;

  protected readonly types: readonly TypeOption[] = [
    { key: 'pub', l: 'Soirée publique', desc: 'Hot-dogs, bar, +200', icon: LucideFlame },
    { key: 'repas', l: 'Repas BAE', desc: 'Membres seuls', icon: LucideChefHat },
    { key: 'event', l: 'Évènement', desc: 'Tournoi, projo…', icon: LucideStar },
    { key: 'priv', l: 'Privée', desc: 'Sur invitation', icon: LucideLock },
  ];

  protected readonly selectedType = signal<TypeKey>('pub');

  protected close(): void {
    this.modalService.close(this.id());
  }
}
