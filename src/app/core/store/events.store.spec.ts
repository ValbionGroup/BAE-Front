import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EventsStore } from './events.store';

describe(EventsStore.name, () => {
  let store: InstanceType<typeof EventsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(EventsStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
