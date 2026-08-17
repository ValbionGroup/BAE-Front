import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Kbd } from './kbd';

@Component({
  imports: [Kbd],
  template: `<bae-kbd>⌘K</bae-kbd>`,
})
class HostComponent {}

describe('Kbd', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render a kbd element with the provided content', () => {
    const hostEl = fixture.nativeElement.querySelector('bae-kbd');
    expect(hostEl).toBeTruthy();

    const kbdEl = hostEl.querySelector('kbd');
    expect(kbdEl).toBeTruthy();
    expect(kbdEl.textContent.trim()).toBe('⌘K');
    expect(kbdEl.className).toContain('mono');
    expect(kbdEl.className).toContain('bg-surface-3');
    expect(kbdEl.className).toContain('text-text-2');
    expect(kbdEl.className).toContain('border-border');
  });
});
