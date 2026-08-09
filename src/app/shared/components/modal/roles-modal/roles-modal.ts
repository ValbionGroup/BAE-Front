import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  LucideDynamicIcon,
  type LucideIconInput,
  LucidePackage,
  LucidePlus,
  LucideSettings,
  LucideSparkles,
  LucideTrash2,
  LucideFlame,
} from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { JOB_PERIODS, JOB_PERIOD_LABELS, type JobPeriod } from '#core/models/job-period.model';
import { RoleModalJob, RoleModalRole, RolesModalConfig } from '../modal.models';
import { ModalShell } from '../modal-shell/modal-shell';

/** One `<optgroup>`: a moment of the soirée and the jobs still selectable in it. */
interface JobOptionGroup {
  period: JobPeriod;
  label: string;
  jobs: readonly RoleModalJob[];
}

/**
 * Pastille de la maquette : une icône teintée devant chaque poste.
 *
 * La maquette donne une icône *par poste* (cuisine, caisse, bar…) ; rien en
 * base ne porte cette information — `jobs` n'a ni icône ni couleur. On la
 * dérive donc du seul attribut réel, la période, ce qui a l'avantage de dire
 * quelque chose de vrai : la couleur code le moment de la soirée.
 */
const PERIOD_ICONS: Readonly<Record<JobPeriod, { icon: LucideIconInput; classes: string }>> = {
  before: { icon: LucidePackage, classes: 'bg-blue-soft text-blue' },
  during: { icon: LucideFlame, classes: 'bg-warn-soft text-warn' },
  after: { icon: LucideSparkles, classes: 'bg-ok-soft text-ok' },
};

@Component({
  selector: 'bfd-roles-modal',
  // `LucidePlus` et `LucideTrash2` ne sont plus des directives ici : les icônes
  // passent toutes par `[lucideIcon]`, donc seul `LucideDynamicIcon` s'importe.
  imports: [LucideDynamicIcon, Btn, ModalShell],
  templateUrl: './roles-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesModal {
  config = input.required<RolesModalConfig>();
  close = output<void>();

  protected readonly draft = signal<RoleModalRole[]>([]);

  /** Jobs not yet staffed on this event, so the same job cannot be added twice. */
  protected readonly unusedJobs = computed(() => {
    const taken = new Set(this.draft().map((role) => role.jobId));
    return this.config().availableJobs.filter((job) => !taken.has(job.id));
  });

  protected readonly canAdd = computed(() => this.unusedJobs().length > 0);

  protected readonly canSave = computed(() =>
    this.draft().every((role) => role.jobId > 0 && role.requiredCount > 0),
  );

  protected readonly icSettings = LucideSettings;
  protected readonly icPlus = LucidePlus;
  protected readonly icTrash = LucideTrash2;

  /**
   * Les deux seules tuiles du bandeau de la maquette qui reposent sur des
   * données réelles. Les deux autres — « membres présents » et « couverture » —
   * ont besoin du roster de la soirée, que la modale ne reçoit pas : les
   * inventer donnerait un chiffre faux au-dessus d'un formulaire d'édition.
   */
  protected readonly totalRequired = computed(() =>
    this.draft().reduce((sum, role) => sum + Math.max(0, role.requiredCount), 0),
  );

  /** Icône et teinte de la pastille, dérivées du moment du poste. */
  protected periodStyle(jobId: number): { icon: LucideIconInput; classes: string } {
    const job = this.config().availableJobs.find((candidate) => candidate.id === jobId);
    return PERIOD_ICONS[job?.period ?? 'during'];
  }

  /** Pas du compteur d'effectif, borné à 1 : un poste armé à zéro se retire. */
  protected step(index: number, delta: number): void {
    this.draft.update((roles) =>
      roles.map((role, i) =>
        i === index ? { ...role, requiredCount: Math.max(1, role.requiredCount + delta) } : role,
      ),
    );
  }

  constructor() {
    effect(() => {
      this.draft.set(this.config().roles.map((role) => ({ ...role })));
    });
  }

  protected onClose(): void {
    this.close.emit();
  }

  /** The options for one row: the job it holds, plus everything still free. */
  protected optionsFor(role: RoleModalRole): readonly RoleModalJob[] {
    const own = this.config().availableJobs.filter((job) => job.id === role.jobId);
    return [...own, ...this.unusedJobs()];
  }

  /**
   * The same options as `optionsFor`, split by moment so the `<select>` can
   * render one `<optgroup>` per period — its `label` is what a screen reader
   * announces before the options it holds. A moment with nothing left to offer
   * is dropped: an empty `<optgroup>` announces a heading over nothing.
   */
  protected optionGroupsFor(role: RoleModalRole): JobOptionGroup[] {
    const options = this.optionsFor(role);
    return JOB_PERIODS.map((period) => ({
      period,
      label: JOB_PERIOD_LABELS[period],
      jobs: options.filter((job) => job.period === period),
    })).filter((group) => group.jobs.length > 0);
  }

  protected jobName(jobId: number): string {
    return this.config().availableJobs.find((job) => job.id === jobId)?.name ?? 'Poste inconnu';
  }

  protected jobPeriodLabel(jobId: number): string {
    const job = this.config().availableJobs.find((candidate) => candidate.id === jobId);
    return job ? JOB_PERIOD_LABELS[job.period] : 'Moment inconnu';
  }

  protected addRole(): void {
    const next = this.unusedJobs()[0];
    if (!next) return;
    this.draft.update((roles) => [...roles, { jobId: next.id, requiredCount: 1 }]);
  }

  protected removeRole(index: number): void {
    this.draft.update((roles) => roles.filter((_, i) => i !== index));
  }

  protected onJobChange(index: number, event: Event): void {
    const value = Number.parseInt((event.target as HTMLSelectElement).value, 10);
    if (!Number.isFinite(value)) return;
    this.draft.update((roles) =>
      roles.map((role, i) => (i === index ? { ...role, jobId: value } : role)),
    );
  }

  protected onCountInput(index: number, event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const next = Number.isFinite(value) ? value : 0;
    this.draft.update((roles) =>
      roles.map((role, i) => (i === index ? { ...role, requiredCount: next } : role)),
    );
  }

  protected inputClass(invalid: boolean): string {
    const base =
      'w-full px-3 py-2 text-[13px] rounded-md bg-surface-2 text-text placeholder-muted focus:outline-none focus-visible:ring-2';
    const border = invalid
      ? 'border border-danger focus-visible:ring-danger/40'
      : 'border border-border focus-visible:ring-blue/40';
    return `${base} ${border}`;
  }

  protected onSave(): void {
    this.config().onSave(this.draft());
    this.close.emit();
  }
}
