import { signalStore, withComputed } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { startOfDay } from 'date-fns';
import { EventsStore } from '#core/store/events.store';
import { EventDetail } from '#core/models/event.model';
import { AgendaEvent } from './models';

function toAgendaEvent(event: EventDetail): AgendaEvent {
  const day = event.date.toLocaleDateString('fr-FR', { day: '2-digit' });
  const month = event.date
    .toLocaleDateString('fr-FR', { month: 'short' })
    .replace('.', '')
    .toUpperCase();
  const time = event.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return {
    day,
    month,
    name: event.name,
    sub: event.location ? `${event.location} · ${time}` : time,
    status: 'À venir',
    statusKind: 'blue',
  };
}

export const AgendaStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const events = inject(EventsStore);
    return {
      loading: computed(() => {
        const status = events.loading();
        return status === 'init' || status === 'loading';
      }),
      data: computed<readonly AgendaEvent[]>(() => {
        const today = startOfDay(new Date()).getTime();
        return [...events.allEvents()]
          .filter((e) => e.date.getTime() >= today)
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .map(toAgendaEvent);
      }),
    };
  }),
);
