import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventDetail } from '#core/models/event.model';
import { MemberModel } from '#core/models/user.model';
import { EventsService } from '#core/services/events/events-service';
import { MenuOverview } from '../menu-overview/menu-overview';
import { OrderTrackerStats } from '../order-tracker-stats/order-tracker-stats';
import {
  LucideCalendar,
  LucideMapPin,
  LucideMonitor,
  LucideDynamicIcon,
} from '@lucide/angular';

@Component({
  selector: 'bfd-current-event-card',
  imports: [
    RouterLink,
    MenuOverview,
    OrderTrackerStats,
    LucideCalendar,
    LucideMapPin,
    LucideMonitor,
    LucideDynamicIcon,
  ],
  templateUrl: './current-event-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentEventCard {
  private readonly eventsService = inject(EventsService);

  event = input.required<EventDetail>();
  member = input.required<MemberModel>();

  protected readonly LucideMonitor = LucideMonitor;

  protected readonly station = computed(() => {
    const memberId = String(this.member().id);
    return this.eventsService.stationForMember(memberId, this.event().event.id);
  });

  protected readonly menuItems = computed(() =>
    this.eventsService.menuForEvent(this.event().event.id),
  );

  protected formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
