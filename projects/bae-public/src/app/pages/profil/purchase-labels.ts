import type { BadgeKind } from '@bae/ui';

const STATUS_LABELS: Readonly<Record<string, string>> = {
  pending: 'Enregistrée',
  in_progress: 'En préparation',
  ready: 'Prête à retirer',
  completed: 'Retirée',
  cancelled: 'Annulée',
};

const STATUS_KINDS: Readonly<Record<string, BadgeKind>> = {
  pending: 'neutral',
  in_progress: 'blue',
  ready: 'warn',
  completed: 'ok',
  cancelled: 'danger',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusKind(status: string): BadgeKind {
  return STATUS_KINDS[status] ?? 'neutral';
}
