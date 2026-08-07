import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { RolesModal } from './roles-modal';
import { RoleModalJob, RoleModalRole, RolesModalConfig } from '../modal.models';
import type { JobPeriod } from '#core/models/job-period.model';

/** The component exposes its state as `protected`; the specs read it through this. */
interface RolesModalInternals {
  draft(): RoleModalRole[];
  unusedJobs(): RoleModalJob[];
  canAdd(): boolean;
  canSave(): boolean;
  addRole(): void;
  removeRole(index: number): void;
  optionsFor(role: RoleModalRole): readonly RoleModalJob[];
  optionGroupsFor(
    role: RoleModalRole,
  ): { period: JobPeriod; label: string; jobs: readonly RoleModalJob[] }[];
  jobName(jobId: number): string;
  jobPeriodLabel(jobId: number): string;
}

const JOBS: RoleModalJob[] = [
  { id: 1, name: 'Barman', period: 'during' },
  { id: 2, name: 'Caissier', period: 'during' },
  { id: 3, name: 'Sécurité', period: 'during' },
  { id: 4, name: 'Rangement', period: 'after' },
  { id: 5, name: 'Installation', period: 'before' },
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
    expect(internals.unusedJobs().map((j) => j.name)).toEqual(JOBS.map((j) => j.name));
  });

  it('never offers the same job twice', async () => {
    await setup([{ jobId: 1, requiredCount: 1 }]);

    expect(internals.unusedJobs().map((j) => j.id)).toEqual([2, 3, 4, 5]);
    // The row's own job stays selectable so its <select> can show it.
    expect(internals.optionsFor({ jobId: 1, requiredCount: 1 }).map((j) => j.id)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  /**
   * Arming a soirée without seeing that nobody is on the rangement is exactly
   * the mistake the grouping prevents.
   */
  it('groups the selectable jobs by moment, chronologically', async () => {
    await setup([{ jobId: 1, requiredCount: 1 }]);

    const groups = internals.optionGroupsFor({ jobId: 1, requiredCount: 1 });
    expect(groups.map((g) => g.period)).toEqual(['before', 'during', 'after']);
    expect(groups.map((g) => g.label)).toEqual(['Préparation', 'Soirée', 'Nettoyage']);
    expect(groups.find((g) => g.period === 'after')!.jobs.map((j) => j.name)).toEqual([
      'Rangement',
    ]);
  });

  it('drops a moment that has nothing left to offer', async () => {
    // Installation is the only `before` job and it is already on the soirée, so
    // the other row must not be offered an empty "Préparation" heading.
    await setup([
      { jobId: 5, requiredCount: 1 },
      { jobId: 4, requiredCount: 1 },
    ]);

    const groups = internals.optionGroupsFor({ jobId: 4, requiredCount: 1 });
    expect(groups.map((g) => g.period)).toEqual(['during', 'after']);
  });

  it('renders one labelled optgroup per moment', async () => {
    await setup([{ jobId: 1, requiredCount: 1 }]);

    const labels = [...fixture.nativeElement.querySelectorAll('optgroup')].map(
      (g) => (g as HTMLOptGroupElement).label,
    );
    expect(labels).toEqual(['Préparation', 'Soirée', 'Nettoyage']);
  });

  it('names the moment of the job on the row', async () => {
    await setup([{ jobId: 4, requiredCount: 1 }]);
    expect(internals.jobPeriodLabel(4)).toBe('Nettoyage');
    expect(fixture.nativeElement.textContent).toContain('Nettoyage');
  });

  it('names an unknown moment rather than rendering an empty label', async () => {
    await setup();
    expect(internals.jobPeriodLabel(99)).toBe('Moment inconnu');
  });

  /**
   * The `<span>Besoin</span>` column header is associated with nothing, so the
   * number input announced as a bare "nombre, 1" — and with three rows on a
   * soirée, nothing said which poste it counted for.
   */
  it('gives the effectif input an accessible name naming its poste', async () => {
    await setup([{ jobId: 4, requiredCount: 2 }]);

    const input = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe(
      'Nombre de personnes nécessaires au poste Rangement (Nettoyage)',
    );
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
    expect(internals.draft().length).toBe(JOBS.length);
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
