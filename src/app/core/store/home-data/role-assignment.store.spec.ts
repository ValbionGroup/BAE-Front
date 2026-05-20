import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RoleAssignmentStore } from './role-assignment.store';

describe(RoleAssignmentStore.name, () => {
  let store: InstanceType<typeof RoleAssignmentStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(RoleAssignmentStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });
});
