import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CoordinationStore } from './coordination.store';

describe(CoordinationStore.name, () => {
  let store: InstanceType<typeof CoordinationStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CoordinationStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
