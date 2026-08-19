import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalContainer } from './modal-container';
import { ModalService } from '../modal.service';

describe('ModalContainer', () => {
  let fixture: ComponentFixture<ModalContainer>;
  let service: ModalService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModalContainer] }).compileComponents();
    service = TestBed.inject(ModalService);
    fixture = TestBed.createComponent(ModalContainer);
    fixture.detectChanges();
  });

  it('renders nothing when the stack is empty', () => {
    const presentation = fixture.nativeElement.querySelector('[role="presentation"]');
    expect(presentation).toBeNull();
  });

  it('renders the backdrop when a modal is open', () => {
    service.open({ type: 'info', title: 'Test', message: 'Hello' });
    fixture.detectChanges();
    const presentation = fixture.nativeElement.querySelector('[role="presentation"]');
    expect(presentation).toBeTruthy();
  });

  it('renders a message modal for non-delete types', () => {
    service.open({ type: 'error', title: 'Error', message: 'Something failed' });
    fixture.detectChanges();
    const messageModal = fixture.nativeElement.querySelector('bfd-message-modal');
    expect(messageModal).toBeTruthy();
  });

  it('renders a delete modal for type delete', () => {
    const deleteConfig: Omit<import('../modal.models').DeleteModalConfig, 'id'> = {
      type: 'delete',
      title: 'Delete',
      message: 'Are you sure?',
      onConfirm: vi.fn(),
    };
    service.open(deleteConfig);
    fixture.detectChanges();
    const deleteModal = fixture.nativeElement.querySelector('bfd-delete-modal');
    expect(deleteModal).toBeTruthy();
  });

  it('closes the top modal on backdrop click', () => {
    service.open({ type: 'info', title: 'Test', message: 'Hello' });
    fixture.detectChanges();
    const backdrop: HTMLElement = fixture.nativeElement.querySelector('[aria-hidden="true"]');
    backdrop.click();
    fixture.detectChanges();
    expect(service.modals()).toHaveLength(0);
  });

  it('closes the top modal on Escape key', () => {
    service.open({ type: 'info', title: 'Test', message: 'Hello' });
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(service.modals()).toHaveLength(0);
  });

  it('only closes the topmost modal when multiple are stacked', () => {
    const id1 = service.open({ type: 'info', title: 'First', message: 'First modal' });
    service.open({ type: 'error', title: 'Second', message: 'Second modal' });
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(service.modals()).toHaveLength(1);
    expect(service.modals()[0].id).toBe(id1);
  });

  it('wraps modals in a definite-width container for responsive sizing', () => {
    service.open({ type: 'info', title: 'Test', message: 'Hello' });
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('[data-modal-id]') as HTMLElement;

    expect(wrapper.classList.contains('absolute')).toBe(true);
    expect(wrapper.classList.contains('inset-x-0')).toBe(true);
    expect(wrapper.classList.contains('pointer-events-none')).toBe(true);
  });

  it('applies pointer-events-auto to the modal itself, not the wrapper', () => {
    service.open({ type: 'info', title: 'Test', message: 'Hello' });
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('[data-modal-id]') as HTMLElement;
    const messageModal = wrapper.querySelector('bfd-message-modal') as HTMLElement;

    expect(wrapper.classList.contains('pointer-events-auto')).toBe(false);
    expect(messageModal).toBeTruthy();
  });
});
