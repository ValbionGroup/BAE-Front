import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { findA11yViolations } from '@bae/ui/testing';

import { ORGANISATION } from '../../core/organisation';
import { Conditions } from './conditions/conditions';
import { Confidentialite } from './confidentialite/confidentialite';

const PAGES: readonly { readonly name: string; readonly component: Type<unknown> }[] = [
  { name: 'Conditions', component: Conditions },
  { name: 'Confidentialité', component: Confidentialite },
];

async function render(component: Type<unknown>): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [component],
    providers: [provideRouter([])],
  }).compileComponents();

  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
}

const squash = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

describe('Pages légales', () => {
  /**
   * Le sommaire est saisi à la main, à côté d'une prose qui l'est aussi.
   * Renommer un `id` de section ou retoucher un titre sans reprendre le sommaire
   * ne casse rien de visible : le lien mène dans le vide, ou annonce un article
   * qui ne porte plus ce nom. Rien d'autre ne l'attrape.
   */
  for (const page of PAGES) {
    it(`${page.name} — chaque entrée du sommaire vise une section au titre identique`, async () => {
      const host = await render(page.component);
      const links = [...host.querySelectorAll<HTMLAnchorElement>('nav a[href*="#"]')];

      expect(links.length).toBeGreaterThan(0);

      for (const link of links) {
        const id = link.getAttribute('href')!.split('#')[1];
        const section = host.querySelector(`#${id}`);

        expect(
          section,
          `${page.name} : le sommaire vise #${id}, absent du document`,
        ).not.toBeNull();

        const heading = section!.querySelector('h2, h3');

        expect(
          squash(heading?.textContent),
          `${page.name} : titre de #${id} et entrée de sommaire divergents`,
        ).toBe(squash(link.textContent));
      }
    });
  }

  /**
   * `index.html` porte un `<base href="/">`, et une URL réduite à un fragment se
   * résout contre la base du document, pas contre l'URL courante : un
   * `href="#editeur"` écrit à la main pointe donc sur `/#editeur`, que le
   * routeur sert comme la page d'accueil. Le sommaire doit produire le chemin
   * complet.
   */
  it('Conditions — le sommaire ancre sur la page courante, pas sur la racine', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'conditions', component: Conditions }])],
    });

    const harness = await RouterTestingHarness.create('/conditions');
    const host = harness.routeNativeElement!;
    const hrefs = [...host.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));

    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.filter((href) => !href?.startsWith('/conditions#'))).toEqual([]);
  });

  /**
   * Un document long se parcourt aux titres et au sommaire : un niveau sauté ou
   * un lien sans intitulé y coûte plus cher qu'ailleurs, et rien à l'écran ne le
   * signale.
   */
  for (const page of PAGES) {
    it(`${page.name} — ne présente aucune violation d'accessibilité`, async () => {
      const host = await render(page.component);

      expect(await findA11yViolations(host)).toEqual([]);
    });
  }

  /**
   * L'article 6-III de la LCEN impose ces identifiants sur le site lui-même.
   * Un remaniement du tableau d'identité qui en perdrait un livrerait des
   * mentions légales qui n'identifient plus l'éditeur — sans erreur de build.
   */
  it('Conditions — publie les identifiants du registre exigés de l’éditeur', async () => {
    const host = await render(Conditions);
    const text = squash(host.textContent);

    for (const identifier of [
      ORGANISATION.registeredName,
      ORGANISATION.rna,
      ORGANISATION.siren,
      ORGANISATION.siret,
      ORGANISATION.publisher,
      ORGANISATION.city,
    ]) {
      expect(text, `identifiant absent des mentions légales : ${identifier}`).toContain(identifier);
    }
  });
});
