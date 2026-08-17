import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Input } from './input';

@Component({
  imports: [Input],
  template: `<bae-input placeholder="Test" />`,
})
class HostComponent {}

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
});
