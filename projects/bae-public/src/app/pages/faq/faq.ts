import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideChevronDown, LucideDynamicIcon } from '@lucide/angular';
import { Badge } from '@bae/ui';

interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

interface FaqGroup {
  readonly category: string;
  readonly entries: readonly FaqEntry[];
}

@Component({
  selector: 'bfp-faq',
  imports: [Badge, LucideDynamicIcon],
  templateUrl: './faq.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Faq {
  protected readonly icChevron = LucideChevronDown;

  protected readonly groups: readonly FaqGroup[] = [
    {
      category: 'Précommandes',
      entries: [
        {
          question: 'Jusqu’à quand puis-je commander ?',
          answer:
            'Les précommandes ferment 12h avant le début de la soirée, ou avant si les places sont épuisées. La date exacte de clôture est indiquée sur chaque soirée.',
        },
        {
          question: 'Comment je récupère ma commande ?',
          answer:
            'Un QR code est envoyé par email après paiement. Présentez-le au stand pour recevoir vos articles.',
        },
        {
          question: 'Puis-je me faire rembourser ?',
          answer:
            'Les précommandes ne sont pas remboursables, sauf annulation de la soirée par le BAE.',
        },
        {
          question: 'Le paiement est-il sécurisé ?',
          answer:
            'Oui, tous les paiements passent par Lydia, aucune donnée bancaire n’est stockée par le BAE.',
        },
      ],
    },
    {
      category: 'FastPass',
      entries: [
        {
          question: 'Le FastPass remplace-t-il l’adhésion ?',
          answer:
            'Oui, il correspond à l’adhésion annuelle. Il s’agit uniquement d’un nom commercial.',
        },
        {
          question: 'Puis-je l’offrir à quelqu’un d’autre ?',
          answer: 'Le pass est nominatif et lié à un compte adhérent, il n’est pas transférable.',
        },
        {
          question: 'Que se passe-t-il à l’échéance ?',
          answer: 'Le pass s’éteint simplement — aucun renouvellement ni prélèvement automatique.',
        },
      ],
    },
    {
      category: 'Compte & adhésion',
      entries: [
        {
          question: 'Comment je me connecte ?',
          answer:
            'La connexion se fait uniquement via votre compte EirbConnect (SSO), aucun mot de passe séparé n’est nécessaire.',
        },
        {
          question: 'Je ne suis pas adhérent, puis-je commander ?',
          answer: 'Oui, les précommandes sont ouvertes à tous.',
        },
      ],
    },
  ];
}
