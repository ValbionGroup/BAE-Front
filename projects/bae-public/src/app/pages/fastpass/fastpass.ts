import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideCheck,
  LucideClock,
  LucideDynamicIcon,
  LucideIconInput,
  LucideLock,
  LucideShield,
  LucideZap,
} from '@lucide/angular';
import { Badge, Btn, Card, ExternalNavigation, Skeleton, formatCents } from '@bae/ui';

import { CatalogStore } from '../../core/catalog.store';
import { PaymentsService } from '../../core/payments.service';
import { SessionStore } from '../../core/session.store';
import type { PublicFastPass } from '../../core/catalog.models';

interface Plan {
  readonly id: number;
  readonly label: string;
  readonly description: string | null;
  readonly priceCents: number;
  readonly perYearCents: number;
  readonly save: number | null;
  readonly highlight: boolean;
}

interface Benefit {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIconInput;
}

@Component({
  selector: 'bfp-fastpass',
  imports: [RouterLink, Btn, Badge, Card, Skeleton, LucideDynamicIcon],
  templateUrl: './fastpass.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Fastpass {
  protected readonly store = inject(CatalogStore);
  private readonly payments = inject(PaymentsService);
  private readonly navigation = inject(ExternalNavigation);
  private readonly session = inject(SessionStore);

  protected readonly icCheck = LucideCheck;

  protected readonly submitting = signal(false);
  protected readonly checkoutError = signal<string | null>(null);

  /**
   * Les tarifs restent consultables déconnecté ; seule la souscription exige un
   * compte. Testé contre `anonymous` et non « pas authentifié » : tant que la
   * session est `unknown`, l'afficher le dirait à quelqu'un déjà connecté.
   */
  protected readonly needsLogin = computed(() => this.session.status() === 'anonymous');

  constructor() {
    this.store.loadFastPasses();
  }

  protected subscribe(fastPassId: number): void {
    if (this.submitting() || !this.session.isAuthenticated()) return;

    this.submitting.set(true);
    this.checkoutError.set(null);

    this.payments.openSubscription(fastPassId).subscribe({
      next: (payment) => {
        if (payment.mobileUrl === null) this.fail();
        else this.navigation.go(payment.mobileUrl);
      },
      error: () => this.fail(),
    });
  }

  private fail(): void {
    this.submitting.set(false);
    this.checkoutError.set('Le paiement n’a pas pu être ouvert. Réessayez dans un instant.');
  }

  protected readonly plans = computed<readonly Plan[]>(() => {
    const passes = this.store.passes();
    if (passes.length === 0) return [];

    const perYear = (pass: PublicFastPass): number =>
      pass.durationYears > 0 ? Math.round(pass.priceCents / pass.durationYears) : pass.priceCents;

    const reference = Math.max(...passes.map(perYear));

    const bestIndex = passes.reduce(
      (best, pass, index) => (perYear(pass) < perYear(passes[best]) ? index : best),
      0,
    );

    return passes.map((pass, index) => {
      const yearly = perYear(pass);
      const saved = reference > 0 ? Math.round(((reference - yearly) / reference) * 100) : 0;

      return {
        id: pass.id,
        label: pass.label,
        description: pass.description,
        priceCents: pass.priceCents,
        perYearCents: yearly,
        save: saved > 0 ? saved : null,
        highlight: index === bestIndex,
      };
    });
  });

  protected readonly perks = computed<readonly string[]>(() => [
    'Accès prioritaire à toutes les soirées',
    `−${this.store.bonusPercent()} % supplémentaires sur vos précommandes`,
    'Badge FastPass nominatif',
  ]);

  protected readonly benefits: readonly Benefit[] = [
    {
      title: 'Zéro file d’attente',
      description: 'Entrée prioritaire à chaque soirée BAE, badge scanné à l’accueil.',
      icon: LucideZap,
    },
    {
      title: 'Précommandes moins chères',
      description:
        'Une réduction supplémentaire sur chaque précommande, cumulée avec celle accordée à tous.',
      icon: LucideClock,
    },
    {
      title: 'Prix bloqué',
      description: 'Le tarif ne bouge pas, même si les cotisations augmentent en cours de pass.',
      icon: LucideLock,
    },
    {
      title: 'Sans reconduction automatique',
      description: 'Le pass s’éteint simplement à échéance, aucun prélèvement.',
      icon: LucideShield,
    },
  ];

  protected readonly faq: readonly (readonly [string, string])[] = [
    [
      'Le FastPass remplace-t-il l’adhésion ?',
      'Le FastPass est votre adhésion : souscrire une formule vous inscrit comme adhérent·e pour toute sa durée.',
    ],
    [
      'Puis-je l’offrir à quelqu’un d’autre ?',
      'Le pass est nominatif et lié à un compte adhérent, il n’est pas transférable.',
    ],
    [
      'Que se passe-t-il à l’échéance ?',
      'Le pass s’éteint simplement — aucun renouvellement ni prélèvement automatique.',
    ],
  ];

  protected euros(cents: number): string {
    return formatCents(cents).replace(',00', '');
  }
}
