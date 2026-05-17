import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideDynamicIcon, LucideTriangleAlert, LucideZap } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Badge } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Toggle } from '#shared/components/ui/toggle/toggle';
import { ParametresSideNav } from '../side-nav/side-nav';

interface Module {
  readonly k: string;
  readonly n: string;
  readonly desc: string;
  readonly on: boolean;
  readonly role: string;
  readonly beta?: boolean;
}

@Component({
  selector: 'bfd-parametres-modules',
  imports: [Badge, Card, Toggle, ParametresSideNav, LucideDynamicIcon],
  templateUrl: './modules.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresModules {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Paramètres',
      subtitle: 'Modules · réservé Présidence',
      breadcrumb: ['Paramètres', 'Modules'],
      activeNavId: 'set',
    });
  }

  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icZap = LucideZap;

  protected readonly modules: readonly Module[] = [
    { k: 'pre', n: 'Précommandes publiques', desc: 'Page publique sans connexion + paiement Lydia + QR retrait', on: true, role: 'Présidence' },
    { k: 'ord', n: 'Caisse hors-ligne', desc: 'iPad sans réseau · réconciliation à la reconnexion', on: true, role: 'Trésorerie' },
    { k: 'alg', n: 'Algo affectation auto', desc: 'Répartition basée sur historique, préférences et bonus/malus', on: true, role: 'Coordination' },
    { k: 'rel', n: 'Relances automatiques', desc: 'Soldes négatifs, présences manquantes, lots périmés', on: true, role: 'Présidence' },
    { k: 'gam', n: 'Gamification membres', desc: 'Points, classement saison, badges (bêta)', on: false, role: 'Coordination' },
    { k: 'ai', n: 'Prédictions IA', desc: 'Estimation CA et stock pour la prochaine soirée', on: false, role: 'Présidence', beta: true },
  ];
}
