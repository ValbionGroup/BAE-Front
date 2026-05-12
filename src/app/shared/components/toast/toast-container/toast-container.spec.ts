import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainer } from './toast-container';
import { ToastService } from '../toast.service';

describe('ToastContainer', () => {
  let fixture: ComponentFixture<ToastContainer>;
  let service: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastContainer] }).compileComponents();
    fixture = TestBed.createComponent(ToastContainer);
    service = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('has an aria-live region', () => {
    const region = fixture.nativeElement.querySelector('[aria-live]');
    expect(region).toBeTruthy();
  });

  it('renders nothing inside the live region when stack is empty', () => {
    const items = fixture.nativeElement.querySelectorAll('[aria-live] > *');
    expect(items.length).toBe(0);
  });

  it('renders a toast title when shown', () => {
    service.show({ type: 'success', title: 'Well done!', duration: 0 });
    fixture.detectChanges();
    const title: HTMLElement = fixture.nativeElement.querySelector('p.font-semibold');
    expect(title.textContent?.trim()).toBe('Well done!');
  });

  it('renders the optional message', () => {
    service.show({ type: 'info', title: 'Info', message: 'Details here.', duration: 0 });
    fixture.detectChanges();
    const paras: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('p');
    const msg = Array.from(paras).find((p) => p.textContent?.trim() === 'Details here.');
    expect(msg).toBeTruthy();
  });

  it('dismisses a toast when × is clicked', () => {
    service.show({ type: 'warning', title: 'Warning', duration: 0 });
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label]');
    btn.click();
    fixture.detectChanges();
    expect(service.toasts()).toHaveLength(0);
  });

  it('error toasts use role="alert"', () => {
    service.show({ type: 'error', title: 'Error!', duration: 0 });
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
  });
});
