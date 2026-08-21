import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtpInput } from './otp-input';

@Component({
  imports: [OtpInput],
  template: `<bae-otp-input
    ariaLabel="Code de vérification à 6 chiffres"
    (completed)="completions.push($event)"
  />`,
})
class HostComponent {
  readonly completions: string[] = [];
}

describe('OtpInput', () => {
  let fixture: ComponentFixture<HostComponent>;
  let inputEl: HTMLInputElement;

  const type = (raw: string): void => {
    inputEl.value = raw;
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    inputEl = fixture.nativeElement.querySelector('bae-otp-input input');
  });

  /**
   * Le rendu segmenté invite à écrire six champs. Ce test est la seule chose qui
   * l'empêche : six `<input>` projetés dans le `<label>` de `bae-field` n'en
   * laisseraient qu'un nommé, et tueraient l'autofill comme le collage.
   */
  it('should expose exactly one field, the boxes being decorative', () => {
    expect(fixture.nativeElement.querySelectorAll('bae-otp-input input').length).toBe(1);

    const boxes = fixture.nativeElement.querySelectorAll(
      'bae-otp-input [aria-hidden="true"] > div',
    );
    expect(boxes.length, 'nombre de cases').toBe(6);
  });

  it('should advertise itself as a one-time-code field', () => {
    expect(inputEl.getAttribute('autocomplete'), 'autocomplete').toBe('one-time-code');
    expect(inputEl.getAttribute('inputmode'), 'inputmode').toBe('numeric');
  });

  it('should keep the field and the value numeric and bounded', () => {
    const cases: ReadonlyArray<[raw: string, expected: string]> = [
      ['4a8b2c', '482'],
      ['482 156', '482156'],
      ['4821567', '482156'],
      ['', ''],
    ];

    for (const [raw, expected] of cases) {
      type(raw);
      expect(inputEl.value, `champ après « ${raw} »`).toBe(expected);
    }
  });

  it('should emit completion once the code is full', () => {
    type('4821');
    expect(fixture.componentInstance.completions, 'code incomplet').toEqual([]);

    type('482156');
    expect(fixture.componentInstance.completions).toEqual(['482156']);
  });

  it('should accent the filled boxes only', () => {
    type('4821');

    const boxes = Array.from<Element>(
      fixture.nativeElement.querySelectorAll('bae-otp-input [aria-hidden="true"] > div'),
    ).map((box) => box.className);

    expect(
      boxes.slice(0, 4).every((c) => c.includes('border-blue')),
      'cases remplies',
    ).toBe(true);
    expect(boxes[5].includes('border-blue'), 'dernière case vide').toBe(false);
  });
});
