import { Component } from '@angular/core';
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
