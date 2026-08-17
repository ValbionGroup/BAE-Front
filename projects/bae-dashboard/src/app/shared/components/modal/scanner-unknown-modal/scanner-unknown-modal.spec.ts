import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { ScannerUnknownModal } from './scanner-unknown-modal';

describe(ScannerUnknownModal.name, () => {
  let component: ScannerUnknownModal;
  let fixture: ComponentFixture<ScannerUnknownModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScannerUnknownModal],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: {} } }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScannerUnknownModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
