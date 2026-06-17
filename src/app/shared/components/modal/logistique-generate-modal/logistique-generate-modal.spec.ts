import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { LogistiqueGenerateModal } from './logistique-generate-modal';

describe(LogistiqueGenerateModal.name, () => {
  let component: LogistiqueGenerateModal;
  let fixture: ComponentFixture<LogistiqueGenerateModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogistiqueGenerateModal],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: {} } }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LogistiqueGenerateModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
