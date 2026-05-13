import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import {
  LucideCheck,
  LucideChefHat,
  LucideClock,
  LucideDynamicIcon,
  LucideEuro,
  LucideIconInput,
  LucideLock,
  LucideMoreHorizontal,
  LucidePackage,
  LucidePlus,
  LucideSettings,
  LucideShoppingCart,
  LucideTruck,
  LucideUsers,
  LucideZap,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Avatar } from '#shared/components/ui/avatar/avatar';

type SemColor = 'red' | 'blue' | 'ok' | 'warn';

interface Poste {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIconInput;
  readonly need: number;
  readonly color: SemColor;
}

interface Membre {
  readonly name: string;
  readonly poste: string;
  readonly score: number;
  readonly lock: boolean;
  readonly bonus: '+' | '−' | '';
}

@Component({
  selector: 'bfd-coordination',
  imports: [Btn, Badge, Avatar, LucideDynamicIcon],
  templateUrl: './coordination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Coordination {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Coordination',
      subtitle: 'Soirée Hivernale · 18 membres présents',
      breadcrumb: ['Préparation', 'Coordination', 'Soirée Hivernale'],
      activeNavId: 'coord',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icSettings = LucideSettings;
  protected readonly icZap = LucideZap;
  protected readonly icCheck = LucideCheck;
  protected readonly icClock = LucideClock;
  protected readonly icLock = LucideLock;
  protected readonly icMore = LucideMoreHorizontal;
  protected readonly icPlus = LucidePlus;

  protected readonly postes: readonly Poste[] = [
    { id: 'cuis', label: 'Cuisine', icon: LucideChefHat, need: 4, color: 'red' },
    { id: 'asse', label: 'Assemblage', icon: LucidePackage, need: 4, color: 'warn' },
    { id: 'cais', label: 'Caisse', icon: LucideShoppingCart, need: 3, color: 'blue' },
    { id: 'serv', label: 'Service', icon: LucideUsers, need: 4, color: 'ok' },
    { id: 'bar', label: 'Bar', icon: LucideEuro, need: 2, color: 'red' },
    { id: 'logi', label: 'Logistique', icon: LucideTruck, need: 1, color: 'blue' },
  ];

  protected readonly membres: readonly Membre[] = [
    { name: 'Tom Bernard', poste: 'Cuisine', score: 92, lock: false, bonus: '+' },
    { name: 'Léa Marchand', poste: 'Caisse', score: 88, lock: true, bonus: '' },
    { name: 'Maxime Dupont', poste: 'Cuisine', score: 84, lock: false, bonus: '' },
    { name: 'Camille Rouvier', poste: 'Service', score: 78, lock: false, bonus: '+' },
    { name: 'Hugo Lefevre', poste: 'Bar', score: 91, lock: true, bonus: '' },
    { name: 'Élise Pichon', poste: 'Assemblage', score: 71, lock: false, bonus: '' },
    { name: 'Antoine Renard', poste: 'Service', score: 65, lock: false, bonus: '−' },
    { name: 'Sarah Mercier', poste: 'Assemblage', score: 82, lock: false, bonus: '' },
    { name: 'Julien Faure', poste: 'Caisse', score: 76, lock: false, bonus: '' },
    { name: 'Noé Garcia', poste: 'Bar', score: 88, lock: false, bonus: '+' },
  ];

  protected assignedTo(label: string): readonly Membre[] {
    return this.membres.filter((m) => m.poste === label);
  }

  protected vacantSlots(p: Poste): readonly null[] {
    const assigned = this.assignedTo(p.label).length;
    const n = Math.max(0, p.need - assigned);
    return Array.from({ length: n }, () => null);
  }

  protected isFull(p: Poste): boolean {
    return this.assignedTo(p.label).length >= p.need;
  }

  protected toFill(p: Poste): number {
    return Math.max(0, p.need - this.assignedTo(p.label).length);
  }

  protected posteBgClass(c: SemColor): string {
    return c === 'red'
      ? 'bg-red-soft text-red'
      : c === 'blue'
        ? 'bg-blue-soft text-blue'
        : c === 'ok'
          ? 'bg-ok-soft text-ok'
          : 'bg-warn-soft text-warn';
  }

  protected scoreClass(score: number): string {
    if (score > 80) return 'text-ok';
    if (score > 70) return 'text-warn';
    return 'text-red';
  }

  protected scoreClassSmall(score: number): string {
    return score > 80 ? 'text-ok' : 'text-warn';
  }

  protected bonusClass(b: Membre['bonus']): string {
    return b === '+' ? 'text-ok' : b === '−' ? 'text-red' : 'text-muted';
  }

  protected prefsFor(m: Membre): readonly string[] {
    if (m.poste === 'Cuisine') return ['Cuisine', 'Bar', 'Assemblage'];
    if (m.poste === 'Caisse') return ['Caisse', 'Service', 'Bar'];
    if (m.poste === 'Bar') return ['Bar', 'Caisse', 'Cuisine'];
    return ['Service', 'Assemblage', 'Caisse'];
  }
}
