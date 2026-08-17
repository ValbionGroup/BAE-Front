import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NextEventStore } from './next-event.store';

describe(NextEventStore.name, () => {
  let store: InstanceType<typeof NextEventStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(NextEventStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
