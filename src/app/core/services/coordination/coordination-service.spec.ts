import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CoordinationService } from './coordination-service';

describe(CoordinationService.name, () => {
  let service: CoordinationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CoordinationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
