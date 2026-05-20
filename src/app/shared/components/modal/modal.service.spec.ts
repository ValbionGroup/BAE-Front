import { TestBed } from '@angular/core/testing';
import { ModalService } from './modal.service';
import type { MessageModalConfig } from './modal.models';

describe(ModalService.name, () => {
  let service: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModalService);
  });

  it('starts with an empty stack', () => {
    expect(service.modals()).toEqual([]);
  });

  it('open() adds a modal and returns its id', () => {
    const id = service.open({ type: 'info', title: 'Test', message: 'Hello' });
    expect(service.modals()).toHaveLength(1);
    expect(service.modals()[0].id).toBe(id);
    expect((service.modals()[0] as MessageModalConfig).title).toBe('Test');
  });

  it('open() preserves insertion order', () => {
    service.open({ type: 'info', title: 'First', message: '' });
    service.open({ type: 'error', title: 'Second', message: '' });
    expect((service.modals()[0] as MessageModalConfig).title).toBe('First');
    expect((service.modals()[1] as MessageModalConfig).title).toBe('Second');
  });

  it('close() removes the modal by id', () => {
    const id1 = service.open({ type: 'info', title: 'First', message: '' });
    service.open({ type: 'error', title: 'Second', message: '' });
    service.close(id1);
    expect(service.modals()).toHaveLength(1);
    expect((service.modals()[0] as MessageModalConfig).title).toBe('Second');
  });

  it('close() is a no-op for unknown ids', () => {
    service.open({ type: 'info', title: 'Test', message: '' });
    service.close('unknown-id');
    expect(service.modals()).toHaveLength(1);
  });
});
