import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { LogistiqueAssignModal } from './logistique-assign-modal';

describe(LogistiqueAssignModal.name, () => {
  let component: LogistiqueAssignModal;
  let fixture: ComponentFixture<LogistiqueAssignModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogistiqueAssignModal],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: {} } }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LogistiqueAssignModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
