import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { RolesModal } from './roles-modal';
import { RoleModalJob, RoleModalRole, RolesModalConfig } from '../modal.models';

/** The component exposes its state as `protected`; the specs read it through this. */
interface RolesModalInternals {
  draft(): RoleModalRole[];
  unusedJobs(): RoleModalJob[];
  canAdd(): boolean;
  canSave(): boolean;
  addRole(): void;
  removeRole(index: number): void;
  optionsFor(role: RoleModalRole): readonly RoleModalJob[];
  jobName(jobId: number): string;
}

const JOBS: RoleModalJob[] = [
  { id: 1, name: 'Barman' },
  { id: 2, name: 'Caissier' },
  { id: 3, name: 'Sécurité' },
];

describe(RolesModal.name, () => {
  let component: RolesModal;
  let internals: RolesModalInternals;
  let fixture: ComponentFixture<RolesModal>;
  let saved: RoleModalRole[] | null;

  async function setup(roles: RoleModalRole[] = []): Promise<void> {
    saved = null;
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
    internals = component as unknown as RolesModalInternals;

    const config: RolesModalConfig = {
      id: 'roles-id',
      type: 'roles',
      roles,
      availableJobs: JOBS,
      onSave: (next) => {
        saved = next;
      },
    };
    fixture.componentRef.setInput('config', config);
    await fixture.whenStable();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  /**
   * Jobs are global objects owned by administration. This modal only decides
   * which of them a soirée needs, so it must never offer a way to invent one.
   */
  it('renders no free-text job name field', async () => {
    await setup([{ jobId: 1, requiredCount: 2 }]);

    const textInputs = fixture.nativeElement.querySelectorAll('input[type="text"]');
    expect(textInputs.length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('select').length).toBe(1);
  });

  it('only offers jobs that exist in the backend', async () => {
    await setup();
    expect(internals.unusedJobs().map((j) => j.name)).toEqual(['Barman', 'Caissier', 'Sécurité']);
  });

  it('never offers the same job twice', async () => {
    await setup([{ jobId: 1, requiredCount: 1 }]);

    expect(internals.unusedJobs().map((j) => j.id)).toEqual([2, 3]);
    // The row's own job stays selectable so its <select> can show it.
    expect(internals.optionsFor({ jobId: 1, requiredCount: 1 }).map((j) => j.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it('adds the first still-unused job rather than a blank row', async () => {
    await setup([{ jobId: 1, requiredCount: 1 }]);
    internals.addRole();

    expect(internals.draft()).toEqual([
      { jobId: 1, requiredCount: 1 },
      { jobId: 2, requiredCount: 1 },
    ]);
  });

  it('stops offering to add once every job is on the soirée', async () => {
    await setup(JOBS.map((job) => ({ jobId: job.id, requiredCount: 1 })));

    expect(internals.canAdd()).toBe(false);
    internals.addRole();
    expect(internals.draft().length).toBe(3);
  });

  it('refuses to save a poste needing nobody', async () => {
    await setup([{ jobId: 1, requiredCount: 0 }]);
    expect(internals.canSave()).toBe(false);
  });

  it('saves the selected jobs and their counts', async () => {
    await setup([{ jobId: 1, requiredCount: 2 }]);
    internals.addRole();
    component['onSave']();

    expect(saved).toEqual([
      { jobId: 1, requiredCount: 2 },
      { jobId: 2, requiredCount: 1 },
    ]);
  });

  it('names an unknown job rather than rendering an empty label', async () => {
    await setup();
    expect(internals.jobName(99)).toBe('Poste inconnu');
  });
});
