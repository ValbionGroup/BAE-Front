import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Checkbox } from './checkbox';

@Component({
  imports: [Checkbox],
  template: `<bfd-checkbox
    [checked]="checked()"
    ariaLabel="Sélectionner"
    (change)="onChange($event)"
  />`,
})
class HostComponent {
  readonly checked = signal(true);
  readonly received: boolean[] = [];

  onChange(value: boolean): void {
    this.received.push(value);
  }
}

describe('Checkbox', () => {
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

  it('renders with checked=true and emits false on click', () => {
    const button = fixture.nativeElement.querySelector(
      'button[role="checkbox"]',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Sélectionner');

    button.click();
    fixture.detectChanges();

    expect(host.received).toEqual([false]);
    expect(button.getAttribute('aria-checked')).toBe('false');
  });
});
