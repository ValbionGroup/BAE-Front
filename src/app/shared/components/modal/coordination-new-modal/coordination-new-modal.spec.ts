import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { CoordinationNewModal } from './coordination-new-modal';

describe(CoordinationNewModal.name, () => {
  let component: CoordinationNewModal;
  let fixture: ComponentFixture<CoordinationNewModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinationNewModal],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: {} } }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinationNewModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
