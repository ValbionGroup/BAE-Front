import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailSheet } from './detail-sheet';

@Component({
  imports: [DetailSheet],
  template: `<bae-detail-sheet [open]="open()" title="Kro 33cl" (closed)="onClosed()">
    <p>Quatre lots</p>
  </bae-detail-sheet>`,
})
class HostComponent {
  readonly open = signal(true);
  closedCount = 0;

  onClosed(): void {
    this.closedCount += 1;
    this.open.set(false);
  }
}

describe('DetailSheet', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('projette son contenu', () => {
    expect(fixture.nativeElement.textContent).toContain('Quatre lots');
  });

  it('affiche le titre dans un en-tete reserve au mobile', () => {
    const header = fixture.nativeElement.querySelector('[data-testid="sheet-header"]');
    expect(header.className).toContain('md:hidden');
    expect(header.textContent).toContain('Kro 33cl');
  });

  it('emet closed au clic sur la croix', () => {
    const button = fixture.nativeElement.querySelector(
      '[data-testid="sheet-close"]',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(host.closedCount).toBe(1);
  });

  it('emet closed sur Echap quand la feuille est ouverte', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(host.closedCount).toBe(1);
  });

  it("n'emet pas closed sur Echap quand la feuille est fermee", () => {
    host.open.set(false);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(host.closedCount).toBe(0);
  });

  it('sort la feuille du flux sous md quand elle est fermee, sans la demonter', () => {
    host.open.set(false);
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[data-testid="sheet-panel"]') as HTMLElement;
    expect(fixture.nativeElement.textContent).toContain('Quatre lots');
    expect(panel.className).toContain('translate-y-full');
    expect(panel.className).toContain('md:translate-y-0');
  });

  it('couvre la liste derriere un voile seulement quand elle est ouverte', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="sheet-backdrop"]')).toBeTruthy();

    host.open.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="sheet-backdrop"]')).toBeNull();
  });
});
