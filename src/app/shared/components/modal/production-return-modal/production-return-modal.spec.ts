import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '#core/tokens/api-url.token';

import { ProductionReturnModal } from './production-return-modal';
import { PrintService } from '#core/services/print/print-service';

const baseUrl = 'http://api.test/v1';

describe(ProductionReturnModal.name, () => {
  let component: ProductionReturnModal;
  let fixture: ComponentFixture<ProductionReturnModal>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionReturnModal],
      providers: [
        { provide: API_BASE_URL, useValue: baseUrl },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductionReturnModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('eventId', '9');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('prints the closing sheet', () => {
    const printService = TestBed.inject(PrintService);
    const downloadSpy = vi.spyOn(printService, 'download').mockImplementation(() => {});

    component['printClosing']();

    expect(downloadSpy).toHaveBeenCalledWith(
      '/events/9/production-returns/pdf',
      expect.any(String),
    );
  });
});
