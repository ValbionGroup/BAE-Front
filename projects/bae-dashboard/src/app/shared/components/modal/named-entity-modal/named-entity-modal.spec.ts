import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { NamedEntityModal } from './named-entity-modal';
import { ModalService } from '../modal.service';
import type { WriteResult } from '#core/store/referentiels.store';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe(NamedEntityModal.name, () => {
  let fixture: ComponentFixture<NamedEntityModal>;
  let component: NamedEntityModal;

  async function render(
    save: (name: string) => Promise<WriteResult>,
    initial = '',
    onDone: () => void = () => {},
  ): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [NamedEntityModal] }).compileComponents();

    fixture = TestBed.createComponent(NamedEntityModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('title', 'Nouvelle catégorie');
    fixture.componentRef.setInput('initial', initial);
    fixture.componentRef.setInput('save', save);
    fixture.componentRef.setInput('onDone', onDone);
    fixture.detectChanges();
    await settle();
  }

  it('reprend le nom existant à la modification', async () => {
    await render(async () => ({ ok: true }), 'Boissons');

    expect(component['name']()).toBe('Boissons');
  });

  it('refuse d’enregistrer un nom vide, sans appeler le serveur', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    await render(save);

    await component['submit']();

    expect(save).not.toHaveBeenCalled();
  });

  it('rogne les espaces avant d’enregistrer', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    await render(save);

    component['onName']('  Épicerie  ');
    await component['submit']();

    expect(save).toHaveBeenCalledWith('Épicerie');
  });

  /**
   * ⚠️ Le refus du serveur porte une phrase — « 1 bon d'achat rattaché à Metro ».
   * Fermer la modale la ferait disparaître avec la saisie.
   */
  it('garde la modale ouverte et montre le refus du serveur', async () => {
    // ⚠️ La forme compte : `messageOf` lit `error.error.message`, celle que
    // produit `apiEnvelopeInterceptor` sur un `HttpErrorResponse`. Un objet plat
    // retomberait silencieusement sur le message de repli.
    const save = vi.fn().mockResolvedValue({
      ok: false,
      error: { error: { code: 'E_SUPPLIER_IN_USE', message: 'Enseigne encore utilisée.' } },
    });
    await render(save);
    const close = vi.spyOn(TestBed.inject(ModalService), 'close').mockImplementation(() => {});

    component['onName']('Metro');
    await component['submit']();

    expect(close).not.toHaveBeenCalled();
    expect(component['error']()).toContain('Enseigne encore utilisée');
  });

  it('ferme et prévient l’appelant quand l’enregistrement aboutit', async () => {
    const done = vi.fn();
    await render(async () => ({ ok: true }), '', done);
    const close = vi.spyOn(TestBed.inject(ModalService), 'close').mockImplementation(() => {});

    component['onName']('Épicerie');
    await component['submit']();

    expect(done).toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith('modal-id');
  });
});
