import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { GoodCreateModal } from './good-create-modal';

const baseUrl = 'http://api.test/v1';

/**
 * L'emplacement de stockage est **facultatif** à la création : le `<select>`
 * porte une option vide, et c'est cette option-là qui doit atteindre l'API en
 * `null`. Une chaîne vide serait refusée par l'enum côté back.
 */
describe(`${GoodCreateModal.name} — emplacement de stockage`, () => {
  let fixture: ComponentFixture<GoodCreateModal>;
  let http: HttpTestingController;

  /** Le composant expose ses membres en `protected` : le gabarit y accède,
   *  pas le test. On passe donc par un cast, comme les autres specs de modale. */
  function internals(component: GoodCreateModal): {
    onName(v: string): void;
    onUnit(v: string): void;
    onCategoryId(v: string): void;
    onStorageLocation(v: string): void;
    submit(): Promise<void>;
  } {
    return component as unknown as ReturnType<typeof internals>;
  }

  async function render() {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [GoodCreateModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoodCreateModal);
    fixture.componentRef.setInput('id', 'modal-1');
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /** Renseigne le minimum valide, puis envoie. Rend le corps de la requête. */
  async function submitWith(storageLocationId: string): Promise<Record<string, unknown>> {
    const component = await render();
    const api = internals(component);
    api.onName('Steaks hachés');
    api.onUnit('pcs');
    api.onCategoryId('2');
    api.onStorageLocation(storageLocationId);

    const pending = api.submit();
    const req = http.expectOne(`${baseUrl}/goods`);
    req.flush({ id: 1, name: 'Steaks hachés', unit: 'pcs', brand: '', categoryId: 2 });
    await pending;
    return req.request.body;
  }

  it('envoie null quand aucun emplacement n’est choisi', async () => {
    const body = await submitWith('');

    expect(body['storageLocationId']).toBeNull();
  });

  /** ⚠️ Un **nombre**, pas la chaîne du `<select>` : le validateur back attend
   *  un entier, et `'7'` partirait en 422. */
  it('envoie l’identifiant choisi, converti en nombre', async () => {
    const body = await submitWith('7');

    expect(body['storageLocationId']).toBe(7);
  });
});
