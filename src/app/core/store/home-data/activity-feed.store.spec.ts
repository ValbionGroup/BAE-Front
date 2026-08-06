import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ActivityFeedStore } from './activity-feed.store';

describe(ActivityFeedStore.name, () => {
  let store: InstanceType<typeof ActivityFeedStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ActivityFeedStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('reports itself unavailable — no domain activity endpoint exists', () => {
    store.load();

    expect(store.unavailable()).toBe(true);
    expect(store.data()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  /**
   * The feed used to render `GET /v1/logs`, which are HTTP request logs. That
   * produced entries like "lespiet a créé /v1/events" — the shape of an activity
   * feed without being one. It must not silently fall back to that.
   */
  it('makes no HTTP call at all', () => {
    store.load();
    httpMock.verify();
  });

  it('stays unavailable across repeated loads', () => {
    store.load();
    store.load();

    expect(store.unavailable()).toBe(true);
    httpMock.verify();
  });
});
