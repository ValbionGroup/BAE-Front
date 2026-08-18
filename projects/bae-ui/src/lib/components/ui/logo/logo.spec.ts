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
    const img = host.querySelector('img');
    expect(img?.style.height).toBe('28px');
    expect(host.textContent).toContain("BA'ERP");
  });

  it('should resize without breaking the NgOptimizedImage post-init contract', () => {
    fixture.componentRef.setInput('size', 64);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.style.height).toBe('64px');
    expect(img.getAttribute('width')).toBe('350');
  });
});
