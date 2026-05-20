import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { QuickActionsStore } from './quick-actions.store';

describe(QuickActionsStore.name, () => {
  let store: InstanceType<typeof QuickActionsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(QuickActionsStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
