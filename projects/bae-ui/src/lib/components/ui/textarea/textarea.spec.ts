import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Textarea } from './textarea';

@Component({
  imports: [Textarea],
  template: `<bae-textarea
    placeholder="Allergies"
    id="consigne"
    errorId="consigne-error"
    [rows]="4"
    [maxlength]="maxlength()"
    [invalid]="invalid()"
    (valueChange)="lastValue = $event"
  />`,
})
class HostComponent {
  readonly maxlength = signal<number | null>(null);
  readonly invalid = signal(false);
  lastValue = '';
}

@Component({
  imports: [Textarea, ReactiveFormsModule],
  template: `<bae-textarea [formControl]="control" />`,
})
class FormHostComponent {
  readonly control = new FormControl('Sans gluten');
}

describe('Textarea', () => {
  let fixture: ComponentFixture<HostComponent>;

  const textarea = (): HTMLTextAreaElement =>
    fixture.nativeElement.querySelector('bae-textarea textarea');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('rend un textarea avec son placeholder et son nombre de lignes', () => {
    expect(textarea().getAttribute('placeholder')).toBe('Allergies');
    expect(textarea().getAttribute('rows')).toBe('4');
  });

  it('émet valueChange à la frappe', () => {
    textarea().value = 'Allergie arachide';
    textarea().dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.lastValue).toBe('Allergie arachide');
  });

  /**
   * L'hôte ne prend pas le focus : un `id` qui y reste laisse un `<label for>`
   * de la page sans cible.
   */
  it('transmet id et aria-describedby au textarea interne, pas à l’hôte', () => {
    const host = fixture.nativeElement.querySelector('bae-textarea');

    expect(textarea().getAttribute('id')).toBe('consigne');
    expect(textarea().getAttribute('aria-describedby')).toBe('consigne-error');
    expect(host.getAttribute('id')).toBeNull();
  });

  it('signale l’invalidité aux technologies d’assistance', async () => {
    expect(textarea().getAttribute('aria-invalid')).toBeNull();

    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(textarea().getAttribute('aria-invalid')).toBe('true');
  });

  it('n’affiche un compteur que si maxlength est fourni', async () => {
    expect(fixture.nativeElement.querySelector('bae-textarea [aria-live]')).toBeNull();

    fixture.componentInstance.maxlength.set(500);
    fixture.detectChanges();
    await fixture.whenStable();

    const counter = fixture.nativeElement.querySelector('bae-textarea [aria-live]');
    expect(counter).toBeTruthy();
    expect(counter.textContent).toContain('500');
    expect(textarea().getAttribute('maxlength')).toBe('500');
  });

  it('se pilote par formControl et suit son état désactivé', async () => {
    const form = TestBed.createComponent(FormHostComponent);
    form.detectChanges();
    await form.whenStable();

    const el: HTMLTextAreaElement = form.nativeElement.querySelector('bae-textarea textarea');
    expect(el.value).toBe('Sans gluten');

    el.value = 'Sans lactose';
    el.dispatchEvent(new Event('input'));
    expect(form.componentInstance.control.value).toBe('Sans lactose');

    form.componentInstance.control.disable();
    form.detectChanges();
    await form.whenStable();
    expect(el.disabled).toBe(true);
  });
});
