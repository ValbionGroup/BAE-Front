import axe from 'axe-core';

/**
 * Point d'entrée réservé aux tests, séparé de `public-api` : ce qu'on exporte
 * ici ne doit jamais atteindre le bundle des applications.
 */

/**
 * Règles écartées parce qu'elles jugent une **page**, alors qu'un spec monte un
 * fragment. Les laisser ferait échouer chaque composant sur l'absence de
 * `<main>` ou de `<h1>` — un bruit qui ferait abandonner le harnais au bout de
 * trois écrans.
 */
const PAGE_LEVEL_RULES = ['region', 'landmark-one-main', 'page-has-heading-one', 'html-has-lang'];

/**
 * Les violations d'accessibilité d'un fragment rendu, en texte lisible.
 *
 * Retourne des chaînes et non les objets d'axe : un objet de violation porte
 * chaque nœud fautif avec son HTML, et le diff d'échec devient illisible.
 *
 * ⚠️ Sous jsdom il n'y a ni géométrie ni couleurs calculées : axe désactive de
 * lui-même le contraste et tout ce qui dépend de la visibilité réelle. Ce
 * harnais verrouille la **sémantique** — noms accessibles, rôles, références
 * `aria-*` — pas le rendu.
 */
export async function findA11yViolations(root: Element): Promise<string[]> {
  const results = await axe.run(root, {
    rules: Object.fromEntries(PAGE_LEVEL_RULES.map((id) => [id, { enabled: false }])),
  });

  return results.violations.map((violation) => {
    const targets = violation.nodes
      .map((node) => node.target.join(' '))
      .slice(0, 3)
      .join(', ');
    return `${violation.id} — ${violation.help} → ${targets}`;
  });
}
