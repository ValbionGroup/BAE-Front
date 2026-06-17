import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { StatsStore } from './stats.store';

describe(StatsStore.name, () => {
  let store: InstanceType<typeof StatsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(StatsStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
