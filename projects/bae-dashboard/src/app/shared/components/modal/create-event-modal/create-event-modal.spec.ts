import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateEventModal } from './create-event-modal';
import { CreateEventModalConfig } from '../modal.models';

const baseConfig: CreateEventModalConfig = {
  id: 'test-id',
  title: 'Nouvelle soiree',
  message: 'Renseignez le nom et la date.',
  onCreate: () => {},
};

describe('CreateEventModal', () => {
  let fixture: ComponentFixture<CreateEventModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CreateEventModal] }).compileComponents();
    fixture = TestBed.createComponent(CreateEventModal);
    fixture.componentRef.setInput('config', baseConfig);
    fixture.detectChanges();
  });

  it('renders the title', () => {
    const h2: HTMLElement = fixture.nativeElement.querySelector('h2');
    expect(h2.textContent?.trim()).toBe('Nouvelle soiree');
  });

  it('calls onCreate with form values', () => {
    const onCreate = vi.fn();
    fixture.componentRef.setInput('config', { ...baseConfig, onCreate });
    fixture.detectChanges();

    const inputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input');
    inputs[0].value = 'Soiree Test';
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = '2026-05-20';
    inputs[1].dispatchEvent(new Event('input'));
    inputs[2].value = '20:00';
    inputs[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const create = Array.from(buttons).find((b) => b.textContent?.trim() === 'Creer');
    create?.click();

    expect(onCreate).toHaveBeenCalledWith({
      name: 'Soiree Test',
      date: '2026-05-20',
      time: '20:00',
    });
  });
});
