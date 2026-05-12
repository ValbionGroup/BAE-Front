import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RsvpService } from '#core/services/rsvp/rsvp-service';
import { RsvpStatus } from '#core/models/rsvp.model';
import { ToastService } from '#shared/components/toast/toast.service';

@Component({
  selector: 'bfd-rsvp-actions',
  templateUrl: './rsvp-actions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RsvpActions {
  private readonly rsvpService = inject(RsvpService);
  private readonly toastService = inject(ToastService);

  memberId = input.required<string>();
  eventId = input.required<string>();
  currentStatus = input.required<RsvpStatus>();

  setAttending(): void {
    this.rsvpService.setRsvp(this.memberId(), this.eventId(), 'attending');
    this.toastService.show({ type: 'success', title: 'RSVP enregistre' });
  }

  setAbsent(): void {
    this.rsvpService.setRsvp(this.memberId(), this.eventId(), 'absent');
    this.toastService.show({ type: 'success', title: 'RSVP enregistre' });
  }
}
