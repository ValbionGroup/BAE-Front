import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Toggle } from './toggle';

@Component({
  imports: [Toggle],
  template: `<bfd-toggle [on]="on()" label="Active" (change)="onChange($event)" />`,
})
class HostComponent {
  readonly on = signal(true);
  readonly received: boolean[] = [];

  onChange(value: boolean): void {
    this.received.push(value);
  }
}

describe('Toggle', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders with on=true and emits false on click', () => {
    const button = fixture.nativeElement.querySelector(
      'button[role="switch"]',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-checked')).toBe('true');

    button.click();
    fixture.detectChanges();

    expect(host.received).toEqual([false]);
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('renders the label when provided', () => {
    const labelEl = fixture.nativeElement.querySelector('span.text-text-2');
    expect(labelEl).toBeTruthy();
    expect(labelEl.textContent.trim()).toBe('Active');
  });
});
