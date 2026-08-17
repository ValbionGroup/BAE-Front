import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CaisseStore } from './caisse.store';

describe(CaisseStore.name, () => {
  let store: InstanceType<typeof CaisseStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CaisseStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
