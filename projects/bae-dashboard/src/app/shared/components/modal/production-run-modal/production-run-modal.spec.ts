import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ProductionRunModal } from './production-run-modal';
import { PrintService } from '#core/services/print/print-service';

describe(ProductionRunModal.name, () => {
  let component: ProductionRunModal;
  let fixture: ComponentFixture<ProductionRunModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionRunModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductionRunModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('eventId', '7');
    fixture.componentRef.setInput('productId', 3);
    fixture.componentRef.setInput('productName', 'Hot-dog');
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('prints the plan once a simulation has produced one', () => {
    const printService = TestBed.inject(PrintService);
    const downloadSpy = vi.spyOn(printService, 'download').mockImplementation(() => {});

    fixture.componentRef.setInput('eventId', '7');
    component['plan'].set([]);

    component['printPlan']();

    expect(downloadSpy).toHaveBeenCalledWith('/events/7/production-plan/pdf', expect.any(String));
  });
});
