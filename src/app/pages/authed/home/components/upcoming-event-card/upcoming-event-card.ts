import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EventDetail } from '#core/models/event.model';
import { MemberModel } from '#core/models/user.model';
import { RsvpService } from '#core/services/rsvp/rsvp-service';
import { RsvpStatus } from '#core/models/rsvp.model';
import { RsvpActions } from '../rsvp-actions/rsvp-actions';
import { LucideCalendar, LucideMapPin, LucideUsers } from '@lucide/angular';

const CARD_CLASSES: Record<RsvpStatus, string> = {
  attending:
    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100',
  absent:
    'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100',
  none:
    'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100',
};

const DIVIDER_CLASSES: Record<RsvpStatus, string> = {
  attending: 'border-emerald-200 dark:border-emerald-800/60',
  absent: 'border-red-200 dark:border-red-800/60',
  none: 'border-violet-200 dark:border-violet-800/60',
};

@Component({
  selector: 'bfd-upcoming-event-card',
  imports: [RsvpActions, LucideCalendar, LucideMapPin, LucideUsers],
  templateUrl: './upcoming-event-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingEventCard {
  private readonly rsvpService = inject(RsvpService);

  event = input.required<EventDetail>();
  member = input.required<MemberModel>();

  protected readonly memberIdStr = computed(() => String(this.member().id));

  protected readonly rsvpStatus = computed(() =>
    this.rsvpService.getRsvp(this.memberIdStr(), this.event().event.id)(),
  );

  protected readonly cardClasses = computed(() => CARD_CLASSES[this.rsvpStatus()]);
  protected readonly dividerClasses = computed(() => DIVIDER_CLASSES[this.rsvpStatus()]);

  protected formatShortDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  protected formatFullDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
}
