import { Injectable, Signal, computed, signal } from '@angular/core';
import { RsvpStatus } from '#core/models/rsvp.model';

@Injectable({ providedIn: 'root' })
export class RsvpService {
  private readonly _rsvps = signal<Map<string, RsvpStatus>>(new Map());

  getRsvp(memberId: string, eventId: string): Signal<RsvpStatus> {
    return computed(() => this._rsvps().get(`${memberId}:${eventId}`) ?? 'none');
  }

  setRsvp(memberId: string, eventId: string, status: RsvpStatus): void {
    this._rsvps.update(map => {
      const next = new Map(map);
      next.set(`${memberId}:${eventId}`, status);
      return next;
    });
  }
}
