import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Card } from './card';

@Component({
  imports: [Card],
  template: `
    <bfd-card>
      <span class="content-default">default</span>
    </bfd-card>
    <bfd-card [padding]="0">
      <span class="content-custom">custom</span>
    </bfd-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {}

describe('Card', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders with default padding and the bg-surface class', () => {
    const host = fixture.nativeElement as HTMLElement;
    const cards = host.querySelectorAll<HTMLElement>('bfd-card > div');

    expect(cards.length).toBe(2);

    const defaultCard = cards[0];
    expect(defaultCard.classList.contains('bg-surface')).toBe(true);
    expect(defaultCard.classList.contains('border')).toBe(true);
    expect(defaultCard.classList.contains('border-border-s')).toBe(true);
    expect(defaultCard.classList.contains('rounded-lg')).toBe(true);
    expect(defaultCard.style.padding).toBe('18px');
    expect(defaultCard.querySelector('.content-default')?.textContent).toBe('default');
  });

  it('applies a custom padding value', () => {
    const host = fixture.nativeElement as HTMLElement;
    const customCard = host.querySelectorAll<HTMLElement>('bfd-card > div')[1];

    expect(customCard.style.padding).toBe('0px');
    expect(customCard.classList.contains('bg-surface')).toBe(true);
    expect(customCard.querySelector('.content-custom')?.textContent).toBe('custom');
  });
});
