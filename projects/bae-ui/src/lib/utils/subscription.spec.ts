import { subscriptionExpiry } from './subscription';

describe('subscriptionExpiry', () => {
  it('ajoute la durée en années à la date de souscription', () => {
    expect(subscriptionExpiry('2026-08-28', 1)).toEqual(new Date(2027, 7, 28));
  });

  it('accepte une durée de plusieurs années', () => {
    expect(subscriptionExpiry('2026-08-28', 3)).toEqual(new Date(2029, 7, 28));
  });

  /**
   * Le back calcule `subscribedAt.plus({ years })` avec Luxon, qui **borne** le
   * jour au dernier du mois d'arrivée. `setFullYear` ne le borne pas et déborde
   * sur le 1er mars : l'aperçu annonçait alors un jour de plus que la date
   * réellement enregistrée.
   */
  it('borne le 29 février sur le 28, comme Luxon côté back', () => {
    expect(subscriptionExpiry('2028-02-29', 1)).toEqual(new Date(2029, 1, 28));
  });

  it('retombe sur le 29 février quand l’année d’arrivée est bissextile', () => {
    expect(subscriptionExpiry('2028-02-29', 4)).toEqual(new Date(2032, 1, 29));
  });

  it('rend null sur une date illisible', () => {
    expect(subscriptionExpiry('pas une date', 1)).toBeNull();
  });

  it('rend null sur une chaîne vide', () => {
    expect(subscriptionExpiry('', 1)).toBeNull();
  });

  /** Une formule à durée nulle existe en base : elle expire le jour même. */
  it('accepte une durée nulle', () => {
    expect(subscriptionExpiry('2026-08-28', 0)).toEqual(new Date(2026, 7, 28));
  });
});
