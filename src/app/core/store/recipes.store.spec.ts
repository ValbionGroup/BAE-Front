import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RecipesStore } from './recipes.store';

describe(RecipesStore.name, () => {
  let store: InstanceType<typeof RecipesStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(RecipesStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
