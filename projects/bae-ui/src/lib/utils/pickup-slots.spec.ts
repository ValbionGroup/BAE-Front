import { buildPickupSlots, formatPickupSlot, PICKUP_SLOT_MINUTES } from './pickup-slots';

/**
 * Les bornes sont écrites avec un décalage explicite plutôt qu'en `Z` : les
 * libellés se lisent en heure locale, et un test ancré sur UTC changerait de
 * résultat selon la machine qui l'exécute.
 */
function at(hhmm: string): string {
  return new Date(`2026-02-14T${hhmm}:00`).toISOString();
}

describe('buildPickupSlots', () => {
  it('découpe la soirée en quarts d’heure, bornes comprises', () => {
    const slots = buildPickupSlots(at('20:00'), at('21:00'));

    expect(slots.map((slot) => slot.label)).toEqual(['20:00', '20:15', '20:30', '20:45', '21:00']);
  });

  /** Un retrait à 20 h 00 serait déjà passé quand la soirée ouvre à 20 h 05. */
  it('arrondit le premier créneau vers le haut', () => {
    const slots = buildPickupSlots(at('20:05'), at('21:00'));

    expect(slots[0].label).toBe('20:15');
  });

  it('ne dépasse jamais la fin de la soirée', () => {
    const slots = buildPickupSlots(at('20:00'), at('20:50'));

    expect(slots.at(-1)?.label).toBe('20:45');
  });

  it('rend une liste vide quand la fin précède le début', () => {
    expect(buildPickupSlots(at('21:00'), at('20:00'))).toEqual([]);
  });

  it('rend une liste vide sur une date illisible', () => {
    expect(buildPickupSlots('pas une date', at('21:00'))).toEqual([]);
  });

  it('espace les créneaux du pas annoncé', () => {
    const slots = buildPickupSlots(at('20:00'), at('21:00'));
    const first = new Date(slots[0].value).getTime();
    const second = new Date(slots[1].value).getTime();

    expect((second - first) / 60_000).toBe(PICKUP_SLOT_MINUTES);
  });
});

describe('formatPickupSlot', () => {
  it('rend un tiret sur une date illisible', () => {
    expect(formatPickupSlot('n’importe quoi')).toBe('—');
  });
});
