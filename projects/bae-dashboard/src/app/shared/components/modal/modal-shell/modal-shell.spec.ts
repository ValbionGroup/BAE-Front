import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalShell } from './modal-shell';

@Component({
  imports: [ModalShell],
  template: `<bfd-modal-shell title="Titre" [width]="760" />`,
})
class HostComponent {}

describe('ModalShell', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('traite width comme un maximum et non comme une largeur imposée', () => {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    expect(dialog.style.maxWidth).toBe('760px');
    // Une largeur imposée empêcherait la modale de rétrécir sous 760 px.
    expect(dialog.style.width).toBe('');
    expect(dialog.classList.contains('w-full')).toBe(true);
  });

  it('occupe toute la hauteur disponible sur mobile et se borne au-dessus de md', () => {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    expect(dialog.className).toContain('max-h-[100dvh]');
    expect(dialog.className).toContain('md:max-h-[90vh]');
  });
});
