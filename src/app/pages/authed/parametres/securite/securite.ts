import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideBell,
  LucideDynamicIcon,
  LucideHouse,
  LucideIconInput,
  LucideLogOut,
  LucidePackage,
  LucideShield,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { ParametresSideNav } from '../side-nav/side-nav';

interface Session {
  readonly d: string;
  readonly loc: string;
  readonly ip: string;
  readonly cur: boolean;
  readonly icon: LucideIconInput;
}

@Component({
  selector: 'bfd-parametres-securite',
  imports: [Btn, Badge, Card, Field, Input, ParametresSideNav, LucideDynamicIcon],
  templateUrl: './securite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresSecurite {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Paramètres',
      subtitle: 'Compte · sécurité',
      breadcrumb: ['Paramètres', 'Sécurité'],
      activeNavId: 'set',
    });
  }

  protected readonly icShield = LucideShield;
  protected readonly icLogout = LucideLogOut;

  protected readonly sessions: readonly Session[] = [
    { d: 'Mac · Chrome 121', loc: 'Paris · maintenant', ip: '92.184.x.x', cur: true, icon: LucideHouse },
    { d: 'iPhone · Safari', loc: 'Paris · il y a 4 h', ip: '212.95.x.x', cur: false, icon: LucideBell },
    { d: "iPad · BAE-ERP", loc: "Local d'école · hier", ip: '10.0.x.x', cur: false, icon: LucidePackage },
  ];
}
