/**
 * Format a priority-credit delta (`member_event_assigned_jobs.points_delta`,
 * or a sum of several).
 *
 * Shared by coordination, mes présences and l'accueil so the same fact reads
 * the same way everywhere: a zero always prints `0 pt`, never a bare `0` or a
 * `·` that hides it, and a negative delta is normal information (a member
 * served on their first choice legitimately spends credit) — never clamped or
 * masked.
 */
export function formatPointsDelta(delta: number): string {
  const unit = Math.abs(delta) > 1 ? 'pts' : 'pt';
  return delta > 0 ? `+${delta} ${unit}` : `${delta} ${unit}`;
}
