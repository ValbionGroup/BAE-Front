import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventList } from './event-list';
import { EventItem } from '../events.models';

const mockEvents: EventItem[] = [
  { id: 1, name: 'Soirée A', date: '2026-06-01', recipeCount: 0 },
  { id: 2, name: 'Soirée B', date: '2026-07-15', recipeCount: 3 },
];

describe(EventList.name, () => {
  let component: EventList;
  let fixture: ComponentFixture<EventList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventList],
    }).compileComponents();

    fixture = TestBed.createComponent(EventList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('events', mockEvents);
    fixture.componentRef.setInput('selectedId', null);
    fixture.componentRef.setInput('showPast', false);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders all passed events', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('nav button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('Soirée A');
    expect(buttons[1].textContent).toContain('Soirée B');
  });

  it('emits eventSelected with the correct id when an event is clicked', () => {
    fixture.detectChanges();
    const emitted: number[] = [];
    fixture.componentInstance.eventSelected.subscribe((id: number) => emitted.push(id));
    const buttons = fixture.nativeElement.querySelectorAll('nav button');
    buttons[1].click();
    expect(emitted).toEqual([2]);
  });

  it('emits togglePast when clicking the inactive tab', () => {
    fixture.detectChanges();
    let count = 0;
    component.togglePast.subscribe(() => {
      count++;
    });
    const pastTab = fixture.nativeElement.querySelectorAll('[role="tab"]')[1] as HTMLElement;
    pastTab.click();
    fixture.detectChanges();
    expect(count).toBe(1);
  });

  it('does NOT emit togglePast when clicking the already-active tab', () => {
    fixture.detectChanges();
    let count = 0;
    component.togglePast.subscribe(() => {
      count++;
    });
    const upcomingTab = fixture.nativeElement.querySelectorAll('[role="tab"]')[0] as HTMLElement;
    upcomingTab.click();
    fixture.detectChanges();
    expect(count).toBe(0);
  });

  it('shows empty state when events array is empty', () => {
    fixture.componentRef.setInput('events', []);
    fixture.detectChanges();
    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    const navButtons = fixture.nativeElement.querySelectorAll('nav button');
    expect(navButtons.length).toBe(0);
  });
});
