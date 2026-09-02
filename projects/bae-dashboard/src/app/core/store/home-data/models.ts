import type { LucideIconInput } from '@lucide/angular';
import type { BadgeKind } from '@bae/ui';
import type { JobPeriod } from '#core/models/job-period.model';
import {
  PAYMENT_METHOD_LABEL,
  type TransactionType,
} from '#core/services/transactions/transactions-service';

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

/** Ce qu'un moyen de paiement a encaissé sur une soirée, **en centimes**. */
export interface ChartSlice {
  readonly method: TransactionType;
  readonly label: string;
  readonly colorClass: string;
  readonly amount: number;
}

export interface ChartBar {
  readonly label: string;
  /** Une part par moyen de paiement, toujours dans l'ordre de `CHART_SERIES`. */
  readonly slices: readonly ChartSlice[];
  readonly isNext: boolean;
}

/**
 * Les trois moyens de paiement, dans l'ordre où ils sont dessinés et légendés.
 * Le `satisfies` garde la liste alignée sur `TransactionType` sans figer le
 * type de `colorClass`, que le gabarit concatène.
 */
export const CHART_SERIES = [
  { method: 'cash', label: PAYMENT_METHOD_LABEL.cash, colorClass: 'bg-ok' },
  { method: 'lydia', label: PAYMENT_METHOD_LABEL.lydia, colorClass: 'bg-blue' },
  { method: 'card', label: PAYMENT_METHOD_LABEL.card, colorClass: 'bg-warn' },
] as const satisfies readonly { method: TransactionType; label: string; colorClass: string }[];

export interface RoleMeta {
  readonly label: string;
  readonly value: string;
}

/**
 * One poste the member holds on the next soirée. A member may hold up to
 * three of these — one per period (D1) — each with its OWN rank and its OWN
 * delta; there is no single "the" assignment any more.
 */
export interface RoleAssignment {
  readonly poste: string;
  readonly icon: LucideIconInput;
  /** Which moment of the soirée this poste belongs to. */
  readonly period: JobPeriod;
  /** « Préparation » / « Soirée » / « Nettoyage ». */
  readonly periodLabel: string;
  readonly meta: readonly RoleMeta[];
  /**
   * Which of the member's own choices this poste was — 1 for their first
   * choice. `null` when they never ranked it, which is what the matching
   * engine treats as "wanted last".
   *
   * Replaces the mockup's invented "algo score /100": the rank is real, comes
   * from `member_job_preferences`, and answers the same question — was this a
   * good assignment for you?
   */
  readonly preferenceRank: number | null;
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
