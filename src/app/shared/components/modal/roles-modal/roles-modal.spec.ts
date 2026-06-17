import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { RolesModal } from './roles-modal';
import { RolesModalConfig } from '../modal.models';

describe(RolesModal.name, () => {
  let component: RolesModal;
  let fixture: ComponentFixture<RolesModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesModal],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: {} } }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesModal);
    component = fixture.componentInstance;
    const config: RolesModalConfig = {
      id: 'roles-id',
      type: 'roles',
      roles: [],
      onSave: () => {},
    };
    fixture.componentRef.setInput('config', config);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
