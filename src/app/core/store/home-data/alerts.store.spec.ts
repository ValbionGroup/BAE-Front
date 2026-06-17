import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AlertsStore } from './alerts.store';

describe(AlertsStore.name, () => {
  let store: InstanceType<typeof AlertsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AlertsStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
