import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteModal } from './delete-modal';
import { DeleteModalConfig } from '../modal.models';

function makeConfig(overrides: Partial<DeleteModalConfig> = {}): DeleteModalConfig {
  return {
    id: 'del-id',
    type: 'delete',
    title: 'Delete item',
    message: 'This is irreversible.',
    onConfirm: vi.fn(),
    ...overrides,
  };
}

describe('DeleteModal', () => {
  let fixture: ComponentFixture<DeleteModal>;
  let component: DeleteModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DeleteModal] }).compileComponents();
    fixture = TestBed.createComponent(DeleteModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', makeConfig());
    fixture.detectChanges();
  });

  function getConfirmBtn(): HTMLButtonElement {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    return Array.from(buttons).find(
      (b) => b.textContent?.trim() === 'Supprimer',
    ) as HTMLButtonElement;
  }

  it('renders title and message', () => {
    const h2: HTMLElement = fixture.nativeElement.querySelector('h2');
    expect(h2.textContent?.trim()).toBe('Delete item');
    const p: HTMLElement = fixture.nativeElement.querySelector('p');
    expect(p.textContent?.trim()).toBe('This is irreversible.');
  });

  it('confirm button is enabled when no confirmationText is set', () => {
    expect(getConfirmBtn().disabled).toBe(false);
  });

  it('does not show confirmation input when confirmationText is absent', () => {
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
  });

  it('shows confirmation input when confirmationText is set', () => {
    fixture.componentRef.setInput('config', makeConfig({ confirmationText: 'delete me' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeTruthy();
  });

  it('confirm button is disabled when confirmationText is set but nothing typed', () => {
    fixture.componentRef.setInput('config', makeConfig({ confirmationText: 'delete me' }));
    fixture.detectChanges();
    expect(getConfirmBtn().disabled).toBe(true);
  });

  it('confirm button is enabled after correct text is typed', () => {
    fixture.componentRef.setInput('config', makeConfig({ confirmationText: 'delete me' }));
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'delete me';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(getConfirmBtn().disabled).toBe(false);
  });

  it('calls onConfirm and emits close when confirmed without typed text requirement', () => {
    const onConfirm = vi.fn();
    const closeSpy = vi.fn();
    fixture.componentRef.setInput('config', makeConfig({ onConfirm }));
    fixture.detectChanges();
    component.close.subscribe(closeSpy);
    getConfirmBtn().click();
    expect(onConfirm).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('emits close when Cancel is clicked', () => {
    const spy = vi.fn();
    component.close.subscribe(spy);
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const cancel = Array.from(buttons).find(
      (b) => b.textContent?.trim() === 'Annuler',
    ) as HTMLButtonElement;
    cancel.click();
    expect(spy).toHaveBeenCalled();
  });
});
