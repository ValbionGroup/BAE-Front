import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  HOSTING_PROVIDER,
  IDENTITY_PROVIDER,
  LEGAL_UPDATED_AT,
  ORGANISATION,
  ORGANISATION_FULL_ADDRESS,
  PAYMENT_PROVIDER,
  SITE,
} from '../../../core/organisation';
import { LegalFacts, type LegalFact } from '../legal-facts/legal-facts';
import { LegalLayout, type LegalTocEntry } from '../legal-layout/legal-layout';

/**
 * Les trois documents que la loi exige d'un site marchand — mentions légales,
 * conditions d'utilisation, conditions de vente — tiennent sur une page parce
 * qu'ils se lisent ensemble : les articles se citent l'un l'autre, et le lecteur
 * qui cherche « suis-je remboursé ? » n'a pas à deviner lequel des trois
 * documents le dit.
 */
@Component({
  selector: 'bfp-conditions',
  imports: [RouterLink, LegalLayout, LegalFacts],
  templateUrl: './conditions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Conditions {
  protected readonly org = ORGANISATION;
  protected readonly host = HOSTING_PROVIDER;
  protected readonly idp = IDENTITY_PROVIDER;
  protected readonly payment = PAYMENT_PROVIDER;
  protected readonly site = SITE;
  protected readonly address = ORGANISATION_FULL_ADDRESS;
  protected readonly updatedAt = LEGAL_UPDATED_AT;

  protected readonly identity: readonly LegalFact[] = [
    { label: 'Dénomination', value: ORGANISATION.registeredName },
    { label: 'Forme juridique', value: ORGANISATION.legalForm },
    { label: 'Numéro RNA', value: ORGANISATION.rna, mono: true },
    { label: 'SIREN', value: ORGANISATION.siren, mono: true },
    { label: 'SIRET du siège', value: ORGANISATION.siret, mono: true },
    { label: 'Code APE', value: `${ORGANISATION.apeCode} — ${ORGANISATION.apeLabel}` },
    { label: 'Siège social', value: ORGANISATION_FULL_ADDRESS },
    { label: 'Association déclarée le', value: ORGANISATION.declaredOn },
    { label: 'Responsable de la publication', value: ORGANISATION.publisher },
    { label: 'Contact', value: ORGANISATION.email, mailto: true },
  ];

  /**
   * L'article 6-III de la LCEN exige de l'hébergeur les mêmes identifiants que
   * de l'éditeur — dénomination, immatriculation, siège, téléphone. Ils sont
   * présentés dans le même tableau que ceux du BAE pour qu'on les lise de la
   * même façon.
   */
  protected readonly hosting: readonly LegalFact[] = [
    { label: 'Dénomination', value: HOSTING_PROVIDER.legalName },
    { label: 'Forme juridique', value: HOSTING_PROVIDER.legalForm },
    { label: 'SIREN', value: HOSTING_PROVIDER.siren, mono: true },
    { label: 'SIRET du siège', value: HOSTING_PROVIDER.siret, mono: true },
    { label: 'RCS', value: HOSTING_PROVIDER.rcs },
    { label: 'TVA intracommunautaire', value: HOSTING_PROVIDER.vat, mono: true },
    { label: 'Siège social', value: HOSTING_PROVIDER.address },
    { label: 'Téléphone', value: HOSTING_PROVIDER.phone, mono: true },
  ];

  protected readonly toc: readonly LegalTocEntry[] = [
    {
      id: 'mentions',
      label: 'Mentions légales',
      children: [
        { id: 'editeur', label: 'Article 1 — Éditeur du site' },
        { id: 'hebergeur', label: 'Article 2 — Hébergement' },
      ],
    },
    {
      id: 'cgu',
      label: 'Conditions d’utilisation',
      children: [
        { id: 'objet', label: 'Article 3 — Objet du service' },
        { id: 'compte', label: 'Article 4 — Compte et connexion' },
        { id: 'usage', label: 'Article 5 — Règles d’usage' },
        { id: 'disponibilite', label: 'Article 6 — Disponibilité du service' },
        { id: 'propriete', label: 'Article 7 — Propriété intellectuelle' },
        { id: 'tiers', label: 'Article 8 — Services extérieurs' },
      ],
    },
    {
      id: 'cgv',
      label: 'Conditions de vente',
      children: [
        { id: 'offre', label: 'Article 9 — Ce que propose le BAE' },
        { id: 'prix', label: 'Article 10 — Prix' },
        { id: 'commande', label: 'Article 11 — Commande et paiement' },
        { id: 'cloture', label: 'Article 12 — Clôture des précommandes' },
        { id: 'retrait', label: 'Article 13 — Retrait des commandes' },
        { id: 'retractation', label: 'Article 14 — Droit de rétractation' },
        { id: 'annulation', label: 'Article 15 — Annulation par le BAE' },
        { id: 'litiges', label: 'Article 16 — Réclamations et litiges' },
        { id: 'donnees', label: 'Article 17 — Données personnelles' },
        { id: 'modification', label: 'Article 18 — Modification des conditions' },
      ],
    },
  ];
}
