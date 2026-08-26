import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { API_BASE_URL, ToastService } from '@bae/ui';
import { vi } from 'vitest';
import { ModalService } from '#shared/components/modal/modal.service';
import { ReferentielsStore } from '#core/store/referentiels.store';
import { Referentiels } from './referentiels';
import type { Permission } from '#core/models/permission.model';

const baseUrl = 'http://api.test/v1';

/** La page charge par promesses nues ; en zoneless, Angular ne les suit pas. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe(Referentiels.name, () => {
  let fixture: ComponentFixture<Referentiels>;
  let http: HttpTestingController;

  async function render(permissions: Permission[]): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Referentiels],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        provideMockStore({ initialState: { auth: { permissions } } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Referentiels);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    fixture.detectChanges();
    await settle();

    http.expectOne(`${baseUrl}/categories`).flush([{ id: 1, name: 'Boissons', goodsCount: 3 }]);
    http
      .expectOne(`${baseUrl}/suppliers`)
      .flush([{ id: 2, name: 'Metro', pricedGoodsCount: 4, voucherCount: 1 }]);
    http
      .expectOne(`${baseUrl}/jobs`)
      .flush([{ id: 3, name: 'Grill', type: 'during', description: null }]);
    await settle();
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('montre les trois onglets à qui porte les trois lectures', async () => {
    await render(['category:read', 'supplier:read', 'job:read']);

    expect(text()).toContain('Catégories');
    expect(text()).toContain('Enseignes');
    expect(text()).toContain('Postes');
  });

  /**
   * ⚠️ La page s'ouvre dès **une** des trois lectures. Un membre qui ne porte
   * que `job:read` ne doit pas voir trois onglets dont deux répondraient 403 —
   * ni atterrir sur un onglet vide, ce qui arriverait si l'onglet actif était
   * codé en dur sur « Catégories ».
   */
  it('ne montre que l’onglet dont la lecture est portée, et l’ouvre', async () => {
    await render(['job:read']);

    expect(text()).toContain('Postes');
    expect(text()).not.toContain('Catégories');
    expect(text()).not.toContain('Enseignes');
    expect(text()).toContain('Grill');
  });

  it('affiche les compteurs d’usage, qui expliquent les refus à venir', async () => {
    await render(['category:read', 'supplier:read', 'job:read']);

    expect(text()).toContain('Boissons');
    expect(text()).toContain('3');

    fixture.componentInstance['setTab']('suppliers');
    fixture.detectChanges();
    expect(text()).toContain('Metro');
    expect(text()).toContain('1');
  });

  /** La période d'un poste se lit avec les libellés du dépôt, pas d'autres. */
  it('nomme la période d’un poste comme le reste de l’application', async () => {
    await render(['job:read']);

    expect(text()).toContain('Soirée');
  });

  /** Une suppression de catégorie déclasse, elle ne détruit pas : l'écran le dit. */
  it('annonce ce qu’une suppression de catégorie va déclasser', async () => {
    await render(['category:read', 'category:delete', 'supplier:read', 'job:read']);
    const open = vi.spyOn(TestBed.inject(ModalService), 'open').mockReturnValue('m');

    fixture.componentInstance['confirmDeleteCategory']({ id: 1, name: 'Boissons', goodsCount: 3 });

    const config = open.mock.calls[0][0] as unknown as { details: string };
    expect(config.details).toContain('3');
    expect(config.details).toContain('sans catégorie');
    expect(config.details).toContain('ne sont pas supprimées');
  });

  /**
   * ⚠️ Le refus porte une phrase que l'utilisateur doit lire — « 1 bon d'achat
   * rattaché à Metro ». L'avaler laisserait un bouton qui ne fait rien, et
   * l'opérateur conclurait à une panne.
   */
  it('affiche le refus du serveur quand l’enseigne est encore utilisée', async () => {
    await render(['supplier:read', 'supplier:delete', 'category:read', 'job:read']);
    vi.spyOn(TestBed.inject(ReferentielsStore), 'deleteSupplier').mockResolvedValue({
      ok: false,
      error: {
        error: {
          code: 'E_SUPPLIER_IN_USE',
          message: '1 bon(s) d’achat rattaché(s) à « Metro » : retirez-les d’abord.',
        },
      },
    });
    const toast = vi.spyOn(TestBed.inject(ToastService), 'show').mockReturnValue('t');

    await fixture.componentInstance['deleteSupplier'](2, 'Metro');

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('bon(s) d’achat'),
      }),
    );
  });

  /** Sans la permission, pas de bouton — on ne propose pas ce qui sera refusé. */
  it('ne propose ni écriture ni suppression sans les permissions', async () => {
    await render(['supplier:read', 'category:read', 'job:read']);
    fixture.componentInstance['setTab']('suppliers');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(text()).toContain('Metro');
    expect(host.querySelectorAll('[data-action="delete"]').length).toBe(0);
    expect(text()).not.toContain('Ajouter');
  });

  it('propose les gestes à qui porte les droits', async () => {
    await render([
      'supplier:read',
      'supplier:write',
      'supplier:delete',
      'category:read',
      'job:read',
    ]);
    fixture.componentInstance['setTab']('suppliers');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('[data-action="delete"]').length).toBe(1);
    expect(text()).toContain('Ajouter');
  });
});
