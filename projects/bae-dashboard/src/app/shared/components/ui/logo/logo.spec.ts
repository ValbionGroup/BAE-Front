import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Logo } from './logo';

describe(Logo.name, () => {
  let component: Logo;
  let fixture: ComponentFixture<Logo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Logo],
    }).compileComponents();

    fixture = TestBed.createComponent(Logo);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create with default size and render the brand text', () => {
    expect(component).toBeTruthy();
    expect(component.size()).toBe(28);
    expect(component.showText()).toBe(true);

    const host = fixture.nativeElement as HTMLElement;
    const svg = host.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('28');
    expect(svg?.getAttribute('height')).toBe('28');
    expect(host.textContent).toContain("BA'ERP");
  });
});
