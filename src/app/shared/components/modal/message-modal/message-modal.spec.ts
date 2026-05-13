import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageModal } from './message-modal';
import { MessageModalConfig } from '../modal.models';

const baseConfig: MessageModalConfig = {
  id: 'test-id',
  type: 'error',
  title: 'An error occurred',
  message: 'Something went wrong.',
};

describe('MessageModal', () => {
  let fixture: ComponentFixture<MessageModal>;
  let component: MessageModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MessageModal] }).compileComponents();
    fixture = TestBed.createComponent(MessageModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', baseConfig);
    fixture.detectChanges();
  });

  it('renders the title', () => {
    const h2: HTMLElement = fixture.nativeElement.querySelector('h2');
    expect(h2.textContent?.trim()).toBe('An error occurred');
  });

  it('renders the message', () => {
    const p: HTMLElement = fixture.nativeElement.querySelector('p');
    expect(p.textContent?.trim()).toBe('Something went wrong.');
  });

  it('emits close when the × button is clicked', () => {
    const spy = vi.fn();
    component.close.subscribe(spy);
    const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Fermer"]');
    closeBtn.click();
    expect(spy).toHaveBeenCalled();
  });

  it('does not show a details section when details is absent', () => {
    expect(fixture.nativeElement.querySelector('pre')).toBeNull();
  });

  it('shows a details toggle when details is provided', () => {
    fixture.componentRef.setInput('config', { ...baseConfig, details: 'stack trace...' });
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const toggle = Array.from(buttons).find(b => b.textContent?.includes('détails'));
    expect(toggle).toBeTruthy();
  });

  it('renders the default Dismiss action for error type', () => {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const dismiss = Array.from(buttons).find(b => b.textContent?.trim() === 'Dismiss');
    expect(dismiss).toBeTruthy();
  });

  it('emits close when an action button is clicked', () => {
    const spy = vi.fn();
    component.close.subscribe(spy);
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const dismiss = Array.from(buttons).find(b => b.textContent?.trim() === 'Dismiss') as HTMLButtonElement;
    dismiss.click();
    expect(spy).toHaveBeenCalled();
  });

  it('renders custom actions when provided', () => {
    fixture.componentRef.setInput('config', {
      ...baseConfig,
      actions: [{ label: 'Custom', action: () => {}, variant: 'primary' }],
    });
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const custom = Array.from(buttons).find(b => b.textContent?.trim() === 'Custom');
    expect(custom).toBeTruthy();
  });

  it('calls the action function when an action button is clicked', () => {
    const actionSpy = vi.fn();
    fixture.componentRef.setInput('config', {
      ...baseConfig,
      actions: [{ label: 'Do it', action: actionSpy, variant: 'primary' }],
    });
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const btn = Array.from(buttons).find(b => b.textContent?.trim() === 'Do it') as HTMLButtonElement;
    btn.click();
    expect(actionSpy).toHaveBeenCalled();
  });
});
