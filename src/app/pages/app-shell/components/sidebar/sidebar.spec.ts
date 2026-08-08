import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: { permissions: [] } } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the "Accueil" nav label', () => {
    const text: string = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Accueil');
  });

  it('hides "Équipe BAE" for a member without role:read', () => {
    const text: string = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Équipe BAE');
  });
});

describe('Sidebar with role:read', () => {
  it('shows "Équipe BAE" for a member holding role:read', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: { permissions: ['role:read'] } } }),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const text: string = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Équipe BAE');
  });
});
