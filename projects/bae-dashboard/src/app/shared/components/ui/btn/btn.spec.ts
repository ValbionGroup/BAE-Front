import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Btn } from './btn';

@Component({
  imports: [Btn],
  template: `<bfd-btn kind="primary" size="md">Action</bfd-btn>`,
})
class HostComponent {}

describe('Btn', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders a button with projected text and primary classes', () => {
    const host = fixture.nativeElement as HTMLElement;
    const button = host.querySelector('button');

    expect(button).toBeTruthy();
    expect(button?.textContent?.trim()).toBe('Action');
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.className).toContain('bg-blue');
    expect(button?.className).toContain('h-[34px]');
  });
});

/**
 * `id` and the `aria-*` attributes used to land on the `<bfd-btn>` host element
 * rather than on the `<button>` inside it. That is not cosmetic: a label
 * pointing at the host describes a non-interactive `<bfd-btn>`, and
 * `aria-describedby` on the host is never read out for the control that is
 * actually focused. Both `home.html` and `my-presences.html` had to fall back
 * to a raw `<button>` for the presence lock because of it.
 */
@Component({
  imports: [Btn],
  template: `<bfd-btn
    id="save"
    ariaLabel="Enregistrer"
    [ariaPressed]="pressed()"
    [ariaDescribedby]="describedBy()"
    >Action</bfd-btn
  >`,
})
class LabelledHostComponent {
  readonly pressed = signal<boolean | null>(true);
  readonly describedBy = signal<string | null>('save-hint');
}

describe('Btn accessibility passthrough', () => {
  let fixture: ComponentFixture<LabelledHostComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelledHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LabelledHostComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('puts the id on the inner button', () => {
    expect(host.querySelector('button')?.getAttribute('id')).toBe('save');
  });

  it('leaves no duplicate id on the host element', () => {
    expect(host.querySelector('bfd-btn')?.hasAttribute('id')).toBe(false);
  });

  it('forwards aria-label, aria-pressed and aria-describedby to the inner button', () => {
    const button = host.querySelector('button');

    expect(button?.getAttribute('aria-label')).toBe('Enregistrer');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.getAttribute('aria-describedby')).toBe('save-hint');
  });

  it('omits aria-pressed and aria-describedby when they are not provided', async () => {
    fixture.componentInstance.pressed.set(null);
    fixture.componentInstance.describedBy.set(null);
    await fixture.whenStable();
    fixture.detectChanges();

    const button = host.querySelector('button');

    expect(button?.hasAttribute('aria-pressed')).toBe(false);
    expect(button?.hasAttribute('aria-describedby')).toBe(false);
  });
});
