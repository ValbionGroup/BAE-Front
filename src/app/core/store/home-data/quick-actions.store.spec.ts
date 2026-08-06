import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { QUICK_ACTION_ROUTES, QuickActionsStore } from './quick-actions.store';

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

  it('publishes its shortcuts on load', () => {
    expect(store.data()).toEqual([]);
    store.load();

    expect(store.loading()).toBe(false);
    expect(store.data().length).toBeGreaterThan(0);
    expect(store.data().every((a) => a.label.length > 0 && a.icon)).toBe(true);
  });

  it('has a route for every shortcut', () => {
    store.load();
    for (const action of store.data()) {
      expect(QUICK_ACTION_ROUTES[action.label]).toBeDefined();
    }
  });

  it('clears back to an empty list', () => {
    store.load();
    store.clear();
    expect(store.data()).toEqual([]);
  });
});
