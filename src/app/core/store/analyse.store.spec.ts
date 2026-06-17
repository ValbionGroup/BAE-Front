import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AnalyseStore } from './analyse.store';

describe(AnalyseStore.name, () => {
  let store: InstanceType<typeof AnalyseStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AnalyseStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
