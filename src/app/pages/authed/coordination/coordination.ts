import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  LucideArrowRight,
  LucideCheck,
  LucideDynamicIcon,
  LucideIconInput,
  LucideLock,
  LucideMoreHorizontal,
  LucidePlus,
  LucideShoppingCart,
  LucideTriangleAlert,
  LucideUsers,
  LucideZap,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Avatar } from '#shared/components/ui/avatar/avatar';

interface Role {
  readonly id: string;
  readonly name: string;
  readonly icon: LucideIconInput;
  readonly required: number;
  readonly assigned: readonly { name: string; locked: boolean; score: number }[];
}

interface Member {
  readonly name: string;
  readonly role: string;
  readonly preferred: string;
  readonly available: boolean;
}

@Component({
  selector: 'bfd-coordination',
  imports: [Btn, Badge, Card, Avatar, LucideDynamicIcon],
  templateUrl: './coordination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Coordination {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Coordination',
      subtitle: 'Soirée Hivernale · 18 postes · algo prêt',
      breadcrumb: ['Préparation', 'Coordination'],
      activeNavId: 'coord',
    });
  }

  protected readonly icPlus = LucidePlus;
  protected readonly icZap = LucideZap;
  protected readonly icCheck = LucideCheck;
  protected readonly icLock = LucideLock;
  protected readonly icMore = LucideMoreHorizontal;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly algoRunning = signal(false);
  protected readonly affectedScore = signal(88);

  protected readonly stats = [
    { label: 'Postes affectés', value: '11/18', kind: 'warn' as const },
    { label: 'Score moyen', value: '88/100', kind: 'ok' as const },
    { label: 'Verrouillés', value: '4', kind: 'blue' as const },
    { label: 'Conflits', value: '2', kind: 'danger' as const },
  ];

  protected readonly roles: readonly Role[] = [
    {
      id: 'cuisine',
      name: 'Cuisine',
      icon: LucideUsers,
      required: 4,
      assigned: [
        { name: 'Maxime Roussel', locked: true, score: 94 },
        { name: 'Inès Berthier', locked: false, score: 88 },
        { name: 'Hugo Martelli', locked: false, score: 76 },
      ],
    },
    {
      id: 'caisse',
      name: 'Caisse',
      icon: LucideShoppingCart,
      required: 3,
      assigned: [
        { name: 'Léa Marchand', locked: true, score: 96 },
        { name: 'Tom Bessière', locked: true, score: 92 },
        { name: 'Yanis Demir', locked: false, score: 81 },
      ],
    },
    {
      id: 'service',
      name: 'Service salle',
      icon: LucideUsers,
      required: 4,
      assigned: [
        { name: 'Sarah Kamiyana', locked: true, score: 90 },
        { name: 'Romain Joly', locked: false, score: 78 },
      ],
    },
    {
      id: 'bar',
      name: 'Bar',
      icon: LucideUsers,
      required: 3,
      assigned: [
        { name: 'Pierre Lavigne', locked: false, score: 84 },
        { name: 'Camille Astier', locked: false, score: 79 },
        { name: 'Élise Pradel', locked: false, score: 72 },
      ],
    },
  ];

  protected readonly available: readonly Member[] = [
    { name: 'Camille Roy', role: 'Membre', preferred: 'Service', available: true },
    { name: 'Antoine Lefèvre', role: 'Membre', preferred: 'Bar', available: true },
    { name: 'Julie Dumas', role: 'Membre', preferred: 'Cuisine', available: true },
    { name: 'Nathan Picard', role: 'Membre', preferred: 'Caisse', available: true },
  ];

  protected readonly progress = computed(() => {
    const total = this.roles.reduce((s, r) => s + r.required, 0);
    const filled = this.roles.reduce((s, r) => s + r.assigned.length, 0);
    return Math.round((filled / total) * 100);
  });

  protected scoreColor(score: number): string {
    if (score >= 90) return 'text-ok';
    if (score >= 75) return 'text-blue';
    return 'text-warn';
  }

  protected roleStatus(role: Role): { label: string; kind: 'ok' | 'warn' | 'danger' } {
    const filled = role.assigned.length;
    if (filled >= role.required) return { label: 'Complet', kind: 'ok' };
    if (filled >= role.required - 1) return { label: 'Presque', kind: 'warn' };
    return { label: 'Incomplet', kind: 'danger' };
  }

  protected runAlgo(): void {
    this.algoRunning.set(true);
    setTimeout(() => this.algoRunning.set(false), 1500);
  }

  protected vacant(role: Role): readonly null[] {
    const n = Math.max(0, role.required - role.assigned.length);
    return Array.from({ length: n }, () => null);
  }
}
