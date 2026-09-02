import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { AnalyseService } from './analyse-service';

describe(AnalyseService.name, () => {
  let service: AnalyseService;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnalyseService);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  it('interroge la saison courante quand aucune année n’est donnée', () => {
    service.getSeason().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/analytics/season`);
    expect(req.request.params.has('season')).toBe(false);
  });

  it('passe l’année demandée en paramètre', () => {
    service.getSeason(2024).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/analytics/season`);
    expect(req.request.params.get('season')).toBe('2024');
  });
});
