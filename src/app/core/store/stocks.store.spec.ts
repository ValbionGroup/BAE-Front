import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { StocksStore } from './stocks.store';

describe(StocksStore.name, () => {
  let store: InstanceType<typeof StocksStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(StocksStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
