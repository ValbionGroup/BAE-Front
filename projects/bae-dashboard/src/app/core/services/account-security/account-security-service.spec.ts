import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { AccountSecurityService } from './account-security-service';

const BASE = 'http://api.test/v1';

/**
 * Une faute de frappe dans un chemin est invisible de toutes les specs de page :
 * elles simulent ce service. Une seule table sur (méthode, verbe, URL) les couvre
 * toutes les cinq, et c'est la seule chose qui les attrape.
 */
describe(AccountSecurityService.name, () => {
  let service: AccountSecurityService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AccountSecurityService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });

    service = TestBed.inject(AccountSecurityService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  interface Case {
    readonly label: string;
    readonly method: string;
    readonly url: string;
    readonly call: () => void;
  }

  const cases: readonly Case[] = [
    {
      label: 'changePassword$',
      method: 'PUT',
      url: `${BASE}/account/password`,
      call: () =>
        service.changePassword$('ancien', 'NouveauMotDePasse1', 'NouveauMotDePasse1').subscribe(),
    },
    {
      label: 'startEnrolment$',
      method: 'POST',
      url: `${BASE}/account/2fa`,
      call: () => service.startEnrolment$().subscribe(),
    },
    {
      label: 'confirmEnrolment$',
      method: 'POST',
      url: `${BASE}/account/2fa/confirm`,
      call: () => service.confirmEnrolment$('482156').subscribe(),
    },
    {
      label: 'regenerateRecoveryCodes$',
      method: 'POST',
      url: `${BASE}/account/2fa/recovery-codes`,
      call: () => service.regenerateRecoveryCodes$().subscribe(),
    },
    {
      label: 'disableTwoFactor$',
      method: 'POST',
      url: `${BASE}/account/2fa/disable`,
      call: () => service.disableTwoFactor$('motdepasse').subscribe(),
    },
  ];

  it.each(cases)('$label appelle $method sur la bonne URL', ({ call, method, url }) => {
    call();

    const request = http.expectOne(url);
    expect(request.request.method).toBe(method);
    request.flush(null);
  });
});
