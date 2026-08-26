import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { JobEditModal } from './job-edit-modal';
import { ReferentielsStore } from '#core/store/referentiels.store';
import type { ApiJob } from '#core/services/referentiels/referentiels-service';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe(JobEditModal.name, () => {
  let fixture: ComponentFixture<JobEditModal>;
  let component: JobEditModal;

  async function render(job: ApiJob | null): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [JobEditModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JobEditModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('job', job);
    fixture.componentRef.setInput('onDone', () => {});
    fixture.detectChanges();
    await settle();
  }

  it('ouvre une création sur la période « soirée »', async () => {
    await render(null);

    expect(component['type']()).toBe('during');
    expect(component['name']()).toBe('');
  });

  /** Le vocabulaire vient de `JOB_PERIOD_LABELS`, jamais réinventé sur place. */
  it('propose les libellés de période du dépôt', async () => {
    await render(null);

    expect(component['periods'].map((p) => p.label)).toEqual([
      'Préparation',
      'Soirée',
      'Nettoyage',
    ]);
  });

  it('reprend les valeurs du poste à modifier', async () => {
    await render({ id: 7, name: 'Grill', type: 'before', description: 'Allumer le charbon' });

    expect(component['name']()).toBe('Grill');
    expect(component['type']()).toBe('before');
    expect(component['description']()).toBe('Allumer le charbon');
  });

  it('refuse d’enregistrer un poste sans nom', async () => {
    await render(null);
    const create = vi.spyOn(TestBed.inject(ReferentielsStore), 'createJob');

    await component['submit']();

    expect(create).not.toHaveBeenCalled();
  });

  /**
   * ⚠️ Une description vide part en `null`, pas en `''` : la colonne est
   * nullable, et une chaîne vide s'afficherait comme une description existante
   * mais muette.
   */
  it('envoie une description vide comme null', async () => {
    await render(null);
    const create = vi
      .spyOn(TestBed.inject(ReferentielsStore), 'createJob')
      .mockResolvedValue({ ok: true });

    component['onName']('Bar');
    await component['submit']();

    expect(create).toHaveBeenCalledWith({ name: 'Bar', type: 'during', description: null });
  });

  it('garde la modale ouverte quand le serveur refuse', async () => {
    await render(null);
    vi.spyOn(TestBed.inject(ReferentielsStore), 'createJob').mockResolvedValue({
      ok: false,
      error: { error: { code: 'E_JOB_IN_USE', message: 'Poste encore rattaché.' } },
    });

    component['onName']('Bar');
    await component['submit']();

    expect(component['error']()).toContain('Poste encore rattaché');
  });

  /**
   * ⚠️ Le test qui compte porte sur le **DOM**, pas sur le signal : `type()`
   * était juste depuis toujours, et le `<select>` affichait quand même
   * « Préparation ». Un `[value]` sur un `<select>` ne peut pas retenir une
   * valeur dont l'`<option>` n'existe pas encore quand Angular l'applique.
   */
  it('présélectionne la période du poste dans le select rendu', async () => {
    await render({ id: 7, name: 'Grill', type: 'before', description: '' });
    fixture.detectChanges();

    const select = (fixture.nativeElement as HTMLElement).querySelector('select');
    expect(select?.value).toBe('before');
  });
});
