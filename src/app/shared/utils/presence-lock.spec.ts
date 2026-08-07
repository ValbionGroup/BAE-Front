import { HttpErrorResponse } from '@angular/common/http';
import { presenceErrorView, presenceLockExplanation } from './presence-lock';
import type { MemberAssignment } from '#core/store/member-assignments.store';
import type { JobPeriod } from '#core/models/job-period.model';

function poste(period: JobPeriod, jobName: string, pointsDelta = 0): MemberAssignment {
  const labels: Record<JobPeriod, string> = {
    before: 'Préparation',
    during: 'Soirée',
    after: 'Nettoyage',
  };
  return {
    eventId: 7,
    jobId: 1,
    jobName,
    period,
    periodLabel: labels[period],
    shortPeriodLabel: labels[period],
    pointsDelta,
  };
}

describe('presenceErrorView', () => {
  it('repeats the API sentence verbatim on the assignment lock', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { code: 'E_PRESENCE_LOCKED_BY_ASSIGNMENT', message: 'Vous tenez un poste.' },
    });

    const view = presenceErrorView(error);
    expect(view.message).toBe('Vous tenez un poste.');
    expect(view.title).toBe('Désengagement impossible');
  });

  it('falls back on a generic sentence when the body is not an API error', () => {
    expect(presenceErrorView(new Error('boom')).message).toContain("n'a pas pu être enregistrée");
  });
});

describe('presenceLockExplanation', () => {
  it('names the single poste held, short', () => {
    const text = presenceLockExplanation([poste('during', 'Service')]);
    expect(text).toContain('Service en soirée');
    expect(text).toMatch(/bureau/);
  });

  it('names every poste when several periods are held', () => {
    const text = presenceLockExplanation([
      poste('before', 'Installation tables'),
      poste('during', 'Service'),
    ]);
    expect(text).toContain('Installation tables');
    expect(text).toContain('Service');
  });
});
