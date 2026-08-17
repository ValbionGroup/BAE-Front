import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Avatar } from './avatar';

@Component({
  imports: [Avatar],
  template: `<bae-avatar name="Léa Marchand" />`,
})
class HostComponent {}

describe('Avatar', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render initials "LM" for "Léa Marchand"', () => {
    const avatarEl = fixture.nativeElement.querySelector('bae-avatar');
    expect(avatarEl).toBeTruthy();
    expect(avatarEl.textContent.trim()).toBe('LM');
  });
});
