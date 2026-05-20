import { TestBed } from '@angular/core/testing';

import { DropdownService } from './dropdown.service';

describe(DropdownService.name, () => {
  let service: DropdownService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DropdownService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
