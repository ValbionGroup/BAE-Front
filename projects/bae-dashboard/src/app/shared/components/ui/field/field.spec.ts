import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Field } from './field';

describe('Field', () => {
  let component: Field;
  let fixture: ComponentFixture<Field>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Field],
    }).compileComponents();

    fixture = TestBed.createComponent(Field);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render label and hint when provided', async () => {
    fixture.componentRef.setInput('label', 'Email');
    fixture.componentRef.setInput('hint', 'format');
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const labelEl = host.querySelector('label');
    expect(labelEl).toBeTruthy();
    expect(labelEl?.className).toContain('flex');
    expect(labelEl?.className).toContain('flex-col');
    expect(labelEl?.className).toContain('gap-1.5');

    const spans = host.querySelectorAll('span');
    expect(spans.length).toBe(2);
    expect(spans[0].textContent?.trim()).toBe('Email');
    expect(spans[0].className).toContain('text-xs');
    expect(spans[0].className).toContain('font-medium');
    expect(spans[0].className).toContain('text-text-2');
    expect(spans[1].textContent?.trim()).toBe('format');
    expect(spans[1].className).toContain('text-[11px]');
    expect(spans[1].className).toContain('text-muted');
  });

  it('should not render label or hint when null', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(component.label()).toBeNull();
    expect(component.hint()).toBeNull();
    expect(host.querySelectorAll('span').length).toBe(0);
  });
});
