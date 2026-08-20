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

  it('capture les clics pour eviter quils ne ferment la modale via le backdrop', () => {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    expect(dialog.classList.contains('pointer-events-auto')).toBe(true);
  });

  it('se centre dans un conteneur pleine largeur', () => {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    expect(dialog.classList.contains('mx-auto')).toBe(true);
  });

  it('porte un nom accessible via aria-labelledby', () => {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const labelledBy = dialog.getAttribute('aria-labelledby');

    expect(labelledBy).toBeTruthy();
    const heading = fixture.nativeElement.querySelector(`#${labelledBy}`) as HTMLElement;
    expect(heading.tagName).toBe('H2');
    expect(heading.textContent?.trim()).toBe('Titre');
  });
});
