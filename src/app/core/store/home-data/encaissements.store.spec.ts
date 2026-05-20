import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EncaissementsStore } from './encaissements.store';

describe(EncaissementsStore.name, () => {
  let store: InstanceType<typeof EncaissementsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(EncaissementsStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
