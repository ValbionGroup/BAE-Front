import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ActivityFeedStore } from './activity-feed.store';

describe(ActivityFeedStore.name, () => {
  let store: InstanceType<typeof ActivityFeedStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ActivityFeedStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
