import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MemberModel } from '#core/models/user.model';
import { LucideStar } from '@lucide/angular';

interface ActivityLine {
  label: string;
  points: number;
}

const RECENT_ACTIVITY: ActivityLine[] = [
  { label: 'Tu as participe a Soiree Hip-Hop', points: 10 },
  { label: 'Attribution du role Barbecue', points: 5 },
  { label: 'Tu as participe a Soiree Jungle', points: 10 },
];

@Component({
  selector: 'bfd-member-stats-card',
  imports: [LucideStar],
  templateUrl: './member-stats-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberStatsCard {
  member = input.required<MemberModel>();

  protected readonly recentActivity = RECENT_ACTIVITY;
}
