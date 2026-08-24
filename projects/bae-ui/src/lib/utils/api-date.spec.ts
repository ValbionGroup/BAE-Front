import { formatApiDate, parseApiDate } from './api-date';

describe('parseApiDate', () => {
  /**
   * Le cœur du sujet : `new Date('2027-09-03')` applique la règle ISO « date
   * seule = UTC », puis tout affichage local la recule d'un jour à l'ouest de
   * Greenwich. Une date sans heure désigne un jour, pas un instant.
   */
  it('lit une date sans heure comme minuit local', () => {
    const date = parseApiDate('2027-09-03');

    expect(date.getFullYear()).toBe(2027);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(3);
    expect(date.getHours()).toBe(0);
  });

  it('respecte le décalage porté par un horodatage complet', () => {
    expect(parseApiDate('2026-02-14T19:30:00.000+01:00').toISOString()).toBe(
      '2026-02-14T18:30:00.000Z',
    );
  });

  it('rend une date invalide sur une chaîne qui n’en est pas une', () => {
    expect(Number.isNaN(parseApiDate('pas une date').getTime())).toBe(true);
  });
});

describe('formatApiDate', () => {
  it('rend le jour tel que le serveur l’a envoyé', () => {
    expect(formatApiDate('2027-09-03')).toBe('03/09/2027');
  });

  it('accepte aussi un horodatage complet', () => {
    expect(formatApiDate('2026-02-14T19:30:00.000+01:00')).toBe('14/02/2026');
  });

  it('remplace une date absente par un tiret', () => {
    expect(formatApiDate(null)).toBe('—');
  });

  it('laisse choisir ce qui remplace une date absente', () => {
    expect(formatApiDate(null, '')).toBe('');
  });

  // Une chaîne illisible ne doit pas ressortir telle quelle à l'écran.
  it('retombe sur le même remplacement quand la date est illisible', () => {
    expect(formatApiDate('2026-13-45')).toBe('—');
  });
});
