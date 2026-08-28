import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { FurnituresStore } from './furnitures.store';
import { API_BASE_URL } from '@bae/ui';
import type { ApiFurniture } from '#core/services/furnitures/furnitures-service';

const baseUrl = 'http://api.test/v1';

function furniture(overrides: Partial<ApiFurniture> = {}): ApiFurniture {
  return { id: 1, name: 'Gobelet 33 cl', quantity: 240, price: 8, ...overrides };
}

describe(FurnituresStore.name, () => {
  let store: InstanceType<typeof FurnituresStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    store = TestBed.inject(FurnituresStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * `write()` n'émet la relecture qu'après la réponse de l'écriture : la requête
   * suivante n'existe pas encore au retour de `flush()`, qui ne fait que
   * programmer la reprise. Sans ce passage de relais, `expectOne` ne trouve rien.
   */
  const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  async function loadWith(items: ApiFurniture[]): Promise<void> {
    const loading = store.load();
    http.expectOne(`${baseUrl}/furnitures`).flush(items);
    await loading;
  }

  /**
   * `GET /furnitures` sert un `Furniture.all()`, donc l'ordre de la clé
   * primaire — le dernier créé en tête. Sans tri ici, une fourniture ajoutée
   * sauterait en haut du tableau.
   */
  it('trie les fournitures par nom', async () => {
    await loadWith([
      furniture({ id: 3, name: 'Serviettes' }),
      furniture({ id: 1, name: 'Gobelet 33 cl' }),
      furniture({ id: 2, name: 'Nappe papier' }),
    ]);

    expect(store.items().map((item) => item.name)).toEqual([
      'Gobelet 33 cl',
      'Nappe papier',
      'Serviettes',
    ]);
  });

  it('signale l’échec du chargement sans vider la page', async () => {
    const loading = store.load();
    http.expectOne(`${baseUrl}/furnitures`).error(new ProgressEvent('error'));
    await loading;

    expect(store.loading()).toBe('error');
    expect(store.loadError()).not.toBeNull();
  });

  it('relit la liste après une création', async () => {
    await loadWith([]);

    const creating = store.create({ name: 'Gobelet 33 cl', quantity: 240, price: 8 });
    const post = http.expectOne(`${baseUrl}/furnitures`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ name: 'Gobelet 33 cl', quantity: 240, price: 8 });
    post.flush(furniture());
    await settled();
    http.expectOne(`${baseUrl}/furnitures`).flush([furniture()]);

    expect(await creating).toEqual({ ok: true });
    expect(store.items()).toHaveLength(1);
  });

  it('envoie un PATCH à la modification et relit la liste', async () => {
    await loadWith([furniture()]);

    const updating = store.update(1, { name: 'Gobelet 50 cl', quantity: 12, price: 10 });
    const patch = http.expectOne(`${baseUrl}/furnitures/1`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush(furniture({ name: 'Gobelet 50 cl', quantity: 12, price: 10 }));
    await settled();
    http.expectOne(`${baseUrl}/furnitures`).flush([furniture({ name: 'Gobelet 50 cl' })]);

    expect(await updating).toEqual({ ok: true });
    expect(store.items()[0].name).toBe('Gobelet 50 cl');
  });

  it('retire la fourniture supprimée', async () => {
    await loadWith([furniture(), furniture({ id: 2, name: 'Serviettes' })]);

    const removing = store.remove(1);
    const request = http.expectOne(`${baseUrl}/furnitures/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    await settled();
    http.expectOne(`${baseUrl}/furnitures`).flush([furniture({ id: 2, name: 'Serviettes' })]);

    expect(await removing).toEqual({ ok: true });
    expect(store.items().map((item) => item.id)).toEqual([2]);
  });

  /**
   * Le refus porte la phrase du serveur, que l'écran affiche : une promesse
   * rejetée que personne n'attrape serait une erreur avalée devant un bouton
   * inerte. Même contrat que `ReferentielsStore.write`.
   */
  it('rend l’erreur d’un refus sans recharger la liste', async () => {
    await loadWith([furniture()]);

    const removing = store.remove(1);
    http
      .expectOne(`${baseUrl}/furnitures/1`)
      .flush({ code: 'E_FURNITURE_IN_USE', message: 'Utilisée' }, { status: 409, statusText: '' });

    const result = await removing;
    expect(result.ok).toBe(false);
    expect(store.items()).toHaveLength(1);
  });
});
