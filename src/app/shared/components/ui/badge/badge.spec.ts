import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Badge } from './badge';

@Component({
  imports: [Badge],
  template: `<bfd-badge kind="ok">Présent·e</bfd-badge>`,
})
class HostComponent {}

describe('Badge', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render content and apply kind class', () => {
    const badgeEl = fixture.nativeElement.querySelector('bfd-badge');
    expect(badgeEl).toBeTruthy();
    expect(badgeEl.textContent.trim()).toBe('Présent·e');

    const span = badgeEl.querySelector('span');
    expect(span).toBeTruthy();
    expect(span.className).toContain('text-ok');
  });
});
