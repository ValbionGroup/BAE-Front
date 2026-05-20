import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AgendaStore } from './agenda.store';

describe(AgendaStore.name, () => {
  let store: InstanceType<typeof AgendaStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AgendaStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
