import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectMember } from '#core/store/auth/auth.selector';
import { EventsService } from '#core/services/events/events-service';
import { CurrentEventCard } from './components/current-event-card/current-event-card';
import { UpcomingEventCard } from './components/upcoming-event-card/upcoming-event-card';
import { MemberStatsCard } from './components/member-stats-card/member-stats-card';

@Component({
  selector: 'bfd-home',
  imports: [CurrentEventCard, UpcomingEventCard, MemberStatsCard],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly store = inject(Store);
  private readonly eventsService = inject(EventsService);

  protected readonly member = this.store.selectSignal(selectMember);

  protected readonly currentEvent = this.eventsService.currentActiveEvent;
  protected readonly upcomingEvents = this.eventsService.upcomingEvents;

  protected readonly firstName = computed(() => this.member()?.firstName ?? '');
}
