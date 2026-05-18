import { signalStore, withComputed } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { startOfDay } from 'date-fns';
import { EventsStore } from '#core/store/events.store';
import { EventDetail } from '#core/models/event.model';
import { NextEvent } from './models';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toNextEvent(event: EventDetail): NextEvent {
  const today = startOfDay(new Date()).getTime();
  const days = Math.max(0, Math.round((startOfDay(event.date).getTime() - today) / MS_PER_DAY));
  return {
    name: event.name,
    date: event.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
    start: event.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    days,
    members: 0,
    prereg: 0,
    preparation: [],
  };
}

export const NextEventStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const events = inject(EventsStore);
    return {
      loading: computed(() => {
        const status = events.loading();
        return status === 'init' || status === 'loading';
      }),
      data: computed<NextEvent | null>(() => {
        const today = startOfDay(new Date()).getTime();
        const next = [...events.allEvents()]
          .filter((e) => e.date.getTime() >= today)
          .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
        return next ? toNextEvent(next) : null;
      }),
    };
  }),
);
