import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { ToastService } from '#shared/components/toast/toast.service';
import { PrintService } from './print-service';

describe(PrintService.name, () => {
  let service: PrintService;
  let http: HttpTestingController;
  let toast: ToastService;
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PrintService);
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('GETs the path as a blob and opens it in a new tab', () => {
    service.download('/events/1/shopping-list/pdf', 'fiche-logistique.pdf');

    const req = http.expectOne('http://api.test/events/1/shopping-list/pdf');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF'], { type: 'application/pdf' }));

    expect(openSpy).toHaveBeenCalledWith('blob:fake-url', '_blank');
  });

  it('shows an error toast instead of opening a tab on failure', () => {
    const toastSpy = vi.spyOn(toast, 'show');

    service.download('/events/1/shopping-list/pdf', 'fiche-logistique.pdf');

    const req = http.expectOne('http://api.test/events/1/shopping-list/pdf');
    req.flush(new Blob(['error'], { type: 'application/json' }), {
      status: 404,
      statusText: 'Not Found',
    });

    expect(openSpy).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Impression impossible' }),
    );
  });
});
