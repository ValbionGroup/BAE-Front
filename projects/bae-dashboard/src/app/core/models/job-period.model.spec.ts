import { JOB_PERIODS, JOB_PERIOD_LABELS, isJobPeriod, type JobPeriod } from './job-period.model';

describe('JOB_PERIODS', () => {
  it('is ordered chronologically: before, during, after', () => {
    expect(JOB_PERIODS).toEqual(['before', 'during', 'after']);
  });

  it('has a non-empty label for every period, in the same order', () => {
    expect(Object.keys(JOB_PERIOD_LABELS)).toEqual([...JOB_PERIODS]);
    for (const period of JOB_PERIODS) {
      expect(JOB_PERIOD_LABELS[period]).toBeTruthy();
    }
  });

  it('labels each period with the expected French wording', () => {
    expect(JOB_PERIOD_LABELS.before).toBe('Préparation');
    expect(JOB_PERIOD_LABELS.during).toBe('Soirée');
    expect(JOB_PERIOD_LABELS.after).toBe('Nettoyage');
  });
});

describe('isJobPeriod', () => {
  it.each(JOB_PERIODS)('accepts %s', (period: JobPeriod) => {
    expect(isJobPeriod(period)).toBe(true);
  });

  it('rejects an unknown string', () => {
    expect(isJobPeriod('unknown')).toBe(false);
  });

  it('rejects non-string values without throwing', () => {
    expect(isJobPeriod(null)).toBe(false);
    expect(isJobPeriod(undefined)).toBe(false);
    expect(isJobPeriod(42)).toBe(false);
    expect(isJobPeriod({})).toBe(false);
  });
});
