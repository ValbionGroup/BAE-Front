import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { CoordinationDeleteModal } from './coordination-delete-modal';

describe(CoordinationDeleteModal.name, () => {
  let component: CoordinationDeleteModal;
  let fixture: ComponentFixture<CoordinationDeleteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinationDeleteModal],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: {} } }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinationDeleteModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('eventId', 1);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
