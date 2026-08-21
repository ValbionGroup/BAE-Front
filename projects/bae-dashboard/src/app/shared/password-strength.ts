/**
 * Les seuils de la jauge sont ceux que le champ annonce déjà en indication :
 * douze caractères, une majuscule, un chiffre — et ce sont aussi ceux que
 * `strongPasswordRule()` applique côté API. Le quatrième palier est une marge
 * au-delà de la règle, pas une exigence : d'où « excellent » et non « requis ».
 *
 * Extrait de la page Sécurité le jour où l'écran de réinitialisation a eu besoin
 * de la même jauge. Deux consommateurs, une seule notation — sinon le même mot de
 * passe recevrait deux verdicts selon la page où on le tape.
 */
const MIN_LENGTH = 12;
const EXCELLENT_LENGTH = 16;
const RULE_ADVICE = 'Au moins 12 caractères, 1 majuscule et 1 chiffre.';

export const PASSWORD_RULE_HINT = '≥ 12 caractères · 1 majuscule · 1 chiffre';

export interface PasswordStrength {
  /** Nombre de barres remplies, de 0 à 4. */
  readonly level: number;
  readonly label: string;
  readonly advice: string;
}

/** Les quatre barres de la jauge, pour un `@for` de gabarit. */
export const STRENGTH_BAR_SLOTS = [1, 2, 3, 4];

export function passwordStrengthOf(value: string): PasswordStrength {
  // Champ vide : aucun verdict. Un « Bon mot de passe » avant la première frappe
  // apprend à ne pas lire la jauge.
  if (value === '') return { level: 0, label: '', advice: '' };

  const met = [value.length >= MIN_LENGTH, /[A-Z]/.test(value), /\d/.test(value)].filter(
    Boolean,
  ).length;

  if (met < 3) {
    return {
      level: met,
      label: met < 2 ? 'Mot de passe faible' : 'Mot de passe moyen',
      advice: RULE_ADVICE,
    };
  }

  const missing = EXCELLENT_LENGTH - value.length;
  if (missing > 0) {
    return {
      level: 3,
      label: 'Bon mot de passe',
      advice: `Ajouter ${missing} caractère${missing > 1 ? 's' : ''} pour « excellent »`,
    };
  }

  return { level: 4, label: 'Excellent mot de passe', advice: '' };
}

/** Le respect de la règle annoncée, indépendamment des paliers de confort. */
export function meetsPasswordRule(value: string): boolean {
  return value.length >= MIN_LENGTH && /[A-Z]/.test(value) && /\d/.test(value);
}
