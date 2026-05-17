import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucidePlus } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Toggle } from '#shared/components/ui/toggle/toggle';
import { ParametresSideNav } from '../side-nav/side-nav';

interface Integration {
  readonly n: string;
  readonly cat: string;
  readonly s: 'on' | 'off';
  readonly acc: string;
  readonly last: string;
  readonly logo: string;
  readonly cls: string;
}

@Component({
  selector: 'bfd-parametres-integrations',
  imports: [Btn, Badge, Card, Toggle, ParametresSideNav],
  templateUrl: './integrations.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresIntegrations {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Paramètres',
      subtitle: 'Intégrations · 6 actives sur 8',
      breadcrumb: ['Paramètres', 'Intégrations'],
      activeNavId: 'set',
    });
  }

  protected readonly icPlus = LucidePlus;

  protected readonly cats = ['Toutes', 'Paiements', 'Courses', 'Identité', 'Cotisations', 'Communication'];
  protected readonly activeCat = signal(0);

  protected readonly integrations: readonly Integration[] = [
    { n: 'Lydia Pro', cat: 'Paiements', s: 'on', acc: 'BAE-ESC · pro@bae-esc.fr', last: 'sync il y a 2 min', logo: 'L', cls: 'text-blue bg-blue-soft' },
    { n: 'Carrefour Pro', cat: 'Courses', s: 'on', acc: 'Carte #21-4218', last: "3 bons d'achat actifs", logo: 'C', cls: 'text-red bg-red-soft' },
    { n: 'Métro France', cat: 'Courses', s: 'on', acc: 'Carte pro · 8842', last: 'sync ce matin', logo: 'M', cls: 'text-warn bg-warn-soft' },
    { n: 'Google Workspace', cat: 'Identité', s: 'on', acc: 'bae-esc.fr', last: 'SSO actif · 14 comptes', logo: 'G', cls: 'text-ok bg-ok-soft' },
    { n: 'HelloAsso', cat: 'Cotisations', s: 'on', acc: 'asso-bae', last: '12 inscriptions · 7 j', logo: 'H', cls: 'text-blue bg-blue-soft' },
    { n: 'Discord', cat: 'Communication', s: 'on', acc: 'BAE Server', last: '184 membres', logo: 'D', cls: 'text-blue bg-blue-soft' },
    { n: 'Notion', cat: 'Documents', s: 'off', acc: '—', last: 'pas connecté', logo: 'N', cls: 'text-muted bg-surface-2' },
    { n: 'Stripe', cat: 'Paiements', s: 'off', acc: '—', last: 'remplacé par Lydia', logo: 'S', cls: 'text-muted bg-surface-2' },
  ];
}
