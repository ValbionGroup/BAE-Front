import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  HOSTING_PROVIDER,
  IDENTITY_PROVIDER,
  LEGAL_UPDATED_AT,
  ORGANISATION,
  PAYMENT_PROVIDER,
} from '../../../core/organisation';
import { LegalFacts, type LegalFact } from '../legal-facts/legal-facts';
import { LegalLayout, type LegalTocEntry } from '../legal-layout/legal-layout';

/**
 * Politique de confidentialité. Elle décrit ce que l'application fait
 * réellement — identité reçue du SSO, commandes, paiements sans coordonnées
 * bancaires, deux cookies techniques — et non le traitement générique d'un site
 * marchand. Toute ligne ajoutée ici doit correspondre à du code existant.
 */
@Component({
  selector: 'bfp-confidentialite',
  imports: [RouterLink, LegalLayout, LegalFacts],
  templateUrl: './confidentialite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Confidentialite {
  protected readonly org = ORGANISATION;
  protected readonly host = HOSTING_PROVIDER;
  protected readonly idp = IDENTITY_PROVIDER;
  protected readonly payment = PAYMENT_PROVIDER;
  protected readonly updatedAt = LEGAL_UPDATED_AT;

  protected readonly collected: readonly LegalFact[] = [
    {
      label: 'Identité',
      value:
        'Nom, prénom et adresse électronique, transmis par EirbConnect au moment de la connexion.',
    },
    {
      label: 'Commandes',
      value:
        'Articles commandés, soirée concernée, montant, référence de commande et statut de retrait.',
    },
    {
      label: 'Paiements',
      value:
        'Référence, montant et statut de la demande de paiement. Aucune coordonnée bancaire : elles sont saisies chez le prestataire de paiement et ne transitent pas par le site.',
    },
    {
      label: 'Adhésion',
      value: 'FastPass souscrit, date de souscription et date d’échéance.',
    },
    {
      label: 'Messages',
      value:
        'Sujet et contenu des messages envoyés depuis la page Contact, rattachés à votre compte.',
    },
    {
      label: 'Journaux techniques',
      value: 'Traces de connexion au serveur, nécessaires au diagnostic des pannes et des abus.',
    },
  ];

  protected readonly purposes: readonly LegalFact[] = [
    {
      label: 'Traiter vos commandes',
      value:
        'Exécution du contrat — sans ces données, il n’y a ni paiement, ni QR code, ni retrait possible.',
    },
    {
      label: 'Gérer votre adhésion',
      value:
        'Exécution du contrat — le FastPass est une adhésion à l’association, qui suppose de savoir qui adhère et jusqu’à quand.',
    },
    {
      label: 'Répondre à vos messages',
      value:
        'Exécution du contrat et intérêt légitime — traiter une réclamation suppose de relier le message à la commande.',
    },
    {
      label: 'Tenir la comptabilité',
      value: 'Obligation légale — les justificatifs des encaissements doivent être conservés.',
    },
    {
      label: 'Sécuriser le service',
      value: 'Intérêt légitime — détecter les abus, les QR codes rejoués et les pannes.',
    },
  ];

  protected readonly retention: readonly LegalFact[] = [
    {
      label: 'Compte et adhésions',
      value: 'Tant que le compte existe, puis trois ans après le dernier contact.',
    },
    {
      label: 'Commandes et paiements',
      value: 'Dix ans, au titre de la conservation des pièces comptables.',
    },
    { label: 'Messages de contact', value: 'Deux ans après la clôture de la demande.' },
    { label: 'Journaux techniques', value: 'Douze mois.' },
  ];

  protected readonly toc: readonly LegalTocEntry[] = [
    { id: 'responsable', label: 'Qui traite vos données' },
    { id: 'donnees', label: 'Les données que le site traite' },
    { id: 'finalites', label: 'Pourquoi, et à quel titre' },
    { id: 'cookies', label: 'Cookies' },
    { id: 'destinataires', label: 'Qui y a accès' },
    { id: 'durees', label: 'Combien de temps elles sont conservées' },
    { id: 'hebergement', label: 'Où elles sont hébergées' },
    { id: 'securite', label: 'Comment elles sont protégées' },
    { id: 'droits', label: 'Vos droits' },
    { id: 'evolution', label: 'Évolution de cette politique' },
  ];
}
