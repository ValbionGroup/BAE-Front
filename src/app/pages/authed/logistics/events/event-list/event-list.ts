import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
} from '@angular/core';
import { LucideCalendar } from '@lucide/angular';
import { EventItem } from '../events.models';

@Component({
  selector: 'bfd-event-list',
  imports: [LucideCalendar],
  templateUrl: './event-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventList {
  events = input.required<EventItem[]>();
  selectedId = input<number | null>(null);
  showPast = input.required<boolean>();

  eventSelected = output<number>();
  togglePast = output<void>();

  @ViewChild('upcomingTab') upcomingTabRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('pastTab') pastTabRef?: ElementRef<HTMLButtonElement>;

  protected selectEvent(id: number): void {
    this.eventSelected.emit(id);
  }

  protected setShowPast(value: boolean): void {
    if (value !== this.showPast()) {
      this.togglePast.emit();
    }
  }

  protected focusUpcomingTab(): void {
    this.upcomingTabRef?.nativeElement.focus();
  }

  protected focusPastTab(): void {
    this.pastTabRef?.nativeElement.focus();
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
