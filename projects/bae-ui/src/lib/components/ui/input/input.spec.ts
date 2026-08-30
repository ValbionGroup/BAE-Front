import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Input } from './input';

@Component({
  imports: [Input],
  template: `<bae-input placeholder="Test" />`,
})
class HostComponent {}

@Component({
  imports: [Input],
  template: `<bae-input id="courriel" errorId="courriel-error" />`,
})
class LabelledHostComponent {}

describe('Input', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render an input with the provided placeholder', () => {
    const inputEl = fixture.nativeElement.querySelector('bae-input input');
    expect(inputEl).toBeTruthy();
    expect(inputEl.getAttribute('placeholder')).toBe('Test');
  });

  /**
   * L'hôte ne prend pas le focus : un `id` ou un `aria-describedby` qui y reste
   * désigne un élément que le lecteur d'écran n'annonce jamais, et un
   * `<label for>` de la page ne cible plus rien.
   */
  it('should forward identifying attributes to the inner input, not the host', async () => {
    const labelled = TestBed.createComponent(LabelledHostComponent);
    labelled.detectChanges();
    await labelled.whenStable();

    const host = labelled.nativeElement.querySelector('bae-input');
    const inputEl = host.querySelector('input');

    const cases: ReadonlyArray<[attribute: string, expected: string]> = [
      ['id', 'courriel'],
      ['aria-describedby', 'courriel-error'],
    ];

    for (const [attribute, expected] of cases) {
      expect(inputEl.getAttribute(attribute), attribute).toBe(expected);
    }

    expect(host.getAttribute('id'), 'host id').toBeNull();
  });
});

@Component({
  imports: [Input, ReactiveFormsModule],
  template: `<bae-input [formControl]="control" />`,
})
class FormHostComponent {
  readonly control = new FormControl('0612345678');
}

describe('Input — mode CVA', () => {
  /**
   * `writeValue` arrive après la création, et l'`effect` qui recopie `[value]`
   * l'écrasait : un `formControl` déjà rempli s'affichait vide.
   */
  it('affiche la valeur du formControl, y compris après coup', async () => {
    await TestBed.configureTestingModule({ imports: [FormHostComponent] }).compileComponents();

    const fixture = TestBed.createComponent(FormHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLInputElement = fixture.nativeElement.querySelector('bae-input input');
    expect(el.value).toBe('0612345678');

    fixture.componentInstance.control.setValue('0699999999');
    fixture.detectChanges();
    expect(el.value).toBe('0699999999');

    TestBed.resetTestingModule();
  });
});
