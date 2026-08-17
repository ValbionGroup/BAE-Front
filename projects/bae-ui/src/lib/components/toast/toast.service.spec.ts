import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';
import { vi } from 'vitest';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts with an empty stack', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('show() adds a toast and returns its id', () => {
    const id = service.show({ type: 'success', title: 'Done', duration: 0 });
    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].id).toBe(id);
    expect(service.toasts()[0].title).toBe('Done');
  });

  it('dismiss() removes a toast immediately', () => {
    const id = service.show({ type: 'info', title: 'Info', duration: 0 });
    service.dismiss(id);
    expect(service.toasts()).toEqual([]);
  });

  it('dismiss() is a no-op for unknown ids', () => {
    service.show({ type: 'info', title: 'Info', duration: 0 });
    service.dismiss('unknown-id');
    expect(service.toasts()).toHaveLength(1);
  });

  it('auto-dismisses after the given duration', () => {
    service.show({ type: 'success', title: 'Done', duration: 2000 });
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    expect(service.toasts()).toEqual([]);
  });

  it('does not auto-dismiss when duration is 0', () => {
    service.show({ type: 'info', title: 'Sticky', duration: 0 });
    vi.advanceTimersByTime(60000);
    expect(service.toasts()).toHaveLength(1);
  });

  it('uses 4000ms as default duration', () => {
    service.show({ type: 'info', title: 'Default' });
    vi.advanceTimersByTime(3999);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('caps the stack at 5, removing the oldest when exceeded', () => {
    for (let i = 0; i < 6; i++) {
      service.show({ type: 'info', title: `Toast ${i}`, duration: 0 });
    }
    expect(service.toasts()).toHaveLength(5);
    expect(service.toasts()[0].title).toBe('Toast 1');
    expect(service.toasts()[4].title).toBe('Toast 5');
  });
});
