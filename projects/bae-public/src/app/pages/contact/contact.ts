import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  LucideClock,
  LucideDynamicIcon,
  LucideIconInput,
  LucideMail,
  LucideShield,
} from '@lucide/angular';
import { Badge, Btn, Card, Field, Input } from '@bae/ui';

interface Channel {
  readonly icon: LucideIconInput;
  readonly name: string;
  readonly value: string;
}

@Component({
  selector: 'bfp-contact',
  imports: [Btn, Badge, Card, Field, Input, LucideDynamicIcon],
  templateUrl: './contact.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  protected readonly icMail = LucideMail;

  protected readonly channels: readonly Channel[] = [
    {
      icon: LucideMail,
      name: 'Email',
      value: 'bureau.alternants@enseirb-matmeca.fr',
    },
    {
      icon: LucideClock,
      name: 'Permanence',
      value: 'Mardi & jeudi, 12h30–14h · local BAE',
    },
    {
      icon: LucideShield,
      name: 'Adhésion / cotisation',
      value: 'tresorerie.bae@enseirb-matmeca.fr',
    },
  ];
}
