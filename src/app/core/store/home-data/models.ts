import type { LucideIconInput } from '@lucide/angular';
import type { BadgeKind } from '#shared/components/ui/badge/badge';

export interface KpiTile {
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly positive: boolean;
}

export interface PrepCell {
  readonly label: string;
  readonly value: string;
  readonly progress: number | null;
  readonly colorVar: string;
}

export interface NextEvent {
  readonly name: string;
  readonly date: string;
  readonly start: string;
  readonly days: number;
  readonly members: number;
  readonly prereg: number;
  readonly preparation: readonly PrepCell[];
}

export interface AgendaEvent {
  readonly day: string;
  readonly month: string;
  readonly name: string;
  readonly sub: string;
  readonly status: string;
  readonly statusKind: BadgeKind;
}

export interface AlertItem {
  readonly icon: LucideIconInput;
  readonly title: string;
  readonly sub: string;
  readonly action: string;
  readonly bgClass: string;
  readonly fgClass: string;
}

export interface ChartBar {
  readonly label: string;
  readonly v1: number;
  readonly v2: number;
  readonly isNext: boolean;
}

export interface RoleMeta {
  readonly label: string;
  readonly value: string;
}

export interface RoleAssignment {
  readonly poste: string;
  readonly icon: LucideIconInput;
  readonly meta: readonly RoleMeta[];
  readonly algoScore: number;
}

export interface QuickAction {
  readonly label: string;
  readonly icon: LucideIconInput;
}

export interface ActivityItem {
  readonly who: string;
  readonly what: string;
  readonly emphasis?: string;
  readonly tail?: string;
  readonly when: string;
}
