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
    <bfd-card [fill]="true">
      <span class="content-fill">fill</span>
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

    expect(cards.length).toBe(3);

    const defaultCard = cards[0];
    expect(defaultCard.classList.contains('bg-surface')).toBe(true);
    expect(defaultCard.classList.contains('border')).toBe(true);
    expect(defaultCard.classList.contains('border-border-s')).toBe(true);
    expect(defaultCard.classList.contains('rounded-lg')).toBe(true);
    expect(defaultCard.style.padding).toBe('18px');
    expect(defaultCard.querySelector('.content-default')?.textContent).toBe('default');
  });

  it('leaves the inner div a plain block by default', () => {
    const inner = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      'bfd-card > div',
    )[0];

    expect(inner.classList.contains('flex')).toBe(false);
    expect(inner.classList.contains('overflow-hidden')).toBe(false);
  });

  it('lets the content fill the card and own its scrolling', () => {
    const inner = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      'bfd-card > div',
    )[2];

    // Les classes de flex posées sur `<bfd-card>` s'arrêtent à l'hôte : sans
    // ces classes-ci sur le `<div>` interne, un enfant projeté en
    // `flex-1 overflow-y-auto` ne défile jamais.
    for (const cls of ['flex', 'min-h-0', 'flex-1', 'flex-col', 'overflow-hidden']) {
      expect(inner.classList.contains(cls)).toBe(true);
    }
  });

  it('applies a custom padding value', () => {
    const host = fixture.nativeElement as HTMLElement;
    const customCard = host.querySelectorAll<HTMLElement>('bfd-card > div')[1];

    expect(customCard.style.padding).toBe('0px');
    expect(customCard.classList.contains('bg-surface')).toBe(true);
    expect(customCard.querySelector('.content-custom')?.textContent).toBe('custom');
  });
});
