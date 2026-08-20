import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownService } from '@bae/ui';
import { vi } from 'vitest';

import { PageAction, PageActions } from './page-actions';

@Component({
  imports: [PageActions],
  template: `<bfd-page-actions [actions]="actions()" />`,
})
class HostComponent {
  scanned = 0;
  readonly actions = signal<readonly PageAction[]>([
    { label: 'Scanner', run: () => (this.scanned += 1) },
    { label: 'Inventaire', disabled: true, title: 'Endpoint absent', run: () => {} },
    { label: 'Produit', primary: true, kind: 'primary', run: () => {} },
  ]);
}

describe('PageActions', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let dropdown: DropdownService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    dropdown = TestBed.inject(DropdownService);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('rend chaque action en bouton, masque les secondaires sous md', () => {
    const buttons = fixture.nativeElement.querySelectorAll('[data-testid="action-button"]');
    expect(buttons.length).toBe(3);

    expect(buttons[0].className).toContain('hidden');
    expect(buttons[0].className).toContain('md:inline-flex');
    expect(buttons[1].className).toContain('hidden');
    expect(buttons[2].className).not.toContain('hidden');
  });

  it('ouvre un menu de debordement portant les actions secondaires', () => {
    const spy = vi.spyOn(dropdown, 'toggle');
    const overflow = fixture.nativeElement.querySelector(
      '[data-testid="action-overflow"]',
    ) as HTMLButtonElement;

    expect(overflow.className).toContain('md:hidden');
    overflow.click();

    expect(spy).toHaveBeenCalledTimes(1);
    const config = spy.mock.calls[0][0];
    expect(config.items.map((i) => ('label' in i ? i.label : '—'))).toEqual([
      'Scanner',
      'Inventaire',
    ]);
  });

  it("reporte l'etat desactive et son motif dans le menu", () => {
    const spy = vi.spyOn(dropdown, 'toggle');
    (
      fixture.nativeElement.querySelector('[data-testid="action-overflow"]') as HTMLButtonElement
    ).click();

    const items = spy.mock.calls[0][0].items;
    expect(items[1]).toMatchObject({ label: 'Inventaire', disabled: true });
  });

  it('declenche run au clic sur un bouton', () => {
    const buttons = fixture.nativeElement.querySelectorAll('[data-testid="action-button"] button');
    (buttons[0] as HTMLButtonElement).click();

    expect(host.scanned).toBe(1);
  });

  it("n'affiche pas de menu quand il n'y a qu'une action primaire", () => {
    host.actions.set([{ label: 'Produit', primary: true, run: () => {} }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="action-overflow"]')).toBeNull();
  });
});
