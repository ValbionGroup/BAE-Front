import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { toString as qrToString } from 'qrcode';
import { vi } from 'vitest';

import { IdentityQr } from './identity-qr';

const QR_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.jeton-identite-signe-par-le-back.signature';

@Component({
  imports: [IdentityQr],
  template: `@if (shown()) {
    <bfp-identity-qr alt="Code d’adhérent de Léa Marchand" />
  }`,
})
class HostComponent {
  readonly shown = signal(true);
}

describe(IdentityQr.name, () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
    TestBed.resetTestingModule();
  });

  const mount = (): void => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  };

  const flushQr = (ttlSeconds = 180): void => {
    http
      .expectOne((req) => req.url.endsWith('/account/qr'))
      .flush({ token: QR_TOKEN, expiresAt: '2026-08-24T19:33:00.000+02:00', ttlSeconds });
    fixture.detectChanges();
  };

  const waitForQr = async (): Promise<HTMLImageElement> => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      fixture.detectChanges();

      const img = host.querySelector('img');
      if (img !== null) return img;
    }
    throw new Error('le QR n’a jamais été rendu');
  };

  /** Le QR encode le jeton signé par le back, pas l'identifiant du porteur. */
  it('encode le jeton d’identité émis par le serveur', async () => {
    mount();
    flushQr();
    const img = await waitForQr();

    const svg = await qrToString(QR_TOKEN, { type: 'svg', margin: 1 });
    expect(img.getAttribute('src')).toBe(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
    expect(img.getAttribute('alt')).toBe('Code d’adhérent de Léa Marchand');
  });

  it('montre le refus de l’API plutôt qu’un carré vide, et sait réessayer', async () => {
    mount();
    http
      .expectOne((req) => req.url.endsWith('/account/qr'))
      .flush(
        { code: 'E_OOPS', message: 'Le QR n’a pas pu être émis.' },
        { status: 500, statusText: 'Server Error' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.textContent).toContain('Le QR n’a pas pu être émis.');

    host.querySelector<HTMLButtonElement>('button')?.click();
    flushQr();

    expect(host.textContent).not.toContain('Le QR n’a pas pu être émis.');
  });

  /**
   * Un minuteur survivant à la destruction émettrait des requêtes pour une page
   * que plus personne ne regarde.
   */
  it('renouvelle avant l’échéance, puis cesse une fois détruit', () => {
    vi.useFakeTimers();
    mount();
    flushQr(20);

    vi.advanceTimersByTime(5_000);
    flushQr(20);

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();

    vi.advanceTimersByTime(60_000);
    http.expectNone((req) => req.url.endsWith('/account/qr'));
  });
});
