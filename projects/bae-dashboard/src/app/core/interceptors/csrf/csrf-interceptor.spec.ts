import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { csrfInterceptor, readXsrfToken } from './csrf-interceptor';
import { API_BASE_URL } from '#core/tokens/api-url.token';

const API = 'http://api.test/v1';

describe('readXsrfToken', () => {
  it('lit le jeton parmi d’autres cookies', () => {
    expect(readXsrfToken('autre=1; XSRF-TOKEN=abc123; encore=2')).toBe('abc123');
  });

  /** Shield encode du base64, qui contient des `=` : la valeur ne doit pas être tronquée. */
  it('ne tronque pas une valeur contenant des « = »', () => {
    expect(readXsrfToken('XSRF-TOKEN=YWJjZA==')).toBe('YWJjZA==');
  });

  /** Shield décode lui-même : décoder ici le ferait décoder deux fois. */
  it('rend la valeur brute, sans la décoder', () => {
    expect(readXsrfToken('XSRF-TOKEN=e%3AabcTOKEN')).toBe('e%3AabcTOKEN');
  });

  it('rend null quand le cookie est absent', () => {
    expect(readXsrfToken('autre=1')).toBeNull();
  });

  /** Un cookie dont le nom se termine par XSRF-TOKEN ne doit pas être confondu. */
  it('ne confond pas un cookie de nom voisin', () => {
    expect(readXsrfToken('NOT-XSRF-TOKEN=piege')).toBeNull();
  });
});

describe('csrfInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=jeton-csrf';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([csrfInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('pose l’en-tête sur une écriture', () => {
    http.post(`${API}/tickets`, {}).subscribe();

    const req = httpMock.expectOne(`${API}/tickets`);
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('jeton-csrf');
    req.flush({});
  });

  /** Un GET n'est pas protégé par Shield : lui poser l'en-tête n'a aucun sens. */
  it('ne pose rien sur une lecture', () => {
    http.get(`${API}/tickets`).subscribe();

    const req = httpMock.expectOne(`${API}/tickets`);
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    req.flush({});
  });

  /** Le jeton ne doit jamais partir vers un tiers : ce serait le lui offrir. */
  it('ne pose rien vers une autre origine que l’API', () => {
    http.post('https://ailleurs.test/collecte', {}).subscribe();

    const req = httpMock.expectOne('https://ailleurs.test/collecte');
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    req.flush({});
  });
});
