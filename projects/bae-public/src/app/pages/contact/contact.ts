import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideClock,
  LucideDynamicIcon,
  LucideIconInput,
  LucideMail,
  LucideShield,
} from '@lucide/angular';
import {
  API_BASE_URL,
  Badge,
  Btn,
  Card,
  ExternalNavigation,
  Field,
  Input,
  messageOf,
} from '@bae/ui';

import { ORGANISATION } from '../../core/organisation';
import { SessionStore } from '../../core/session.store';
import { TicketsService } from '../../core/tickets.service';

interface Channel {
  readonly icon: LucideIconInput;
  readonly name: string;
  readonly value: string;
}

const SUPPORT_EMAIL = ORGANISATION.email;

@Component({
  selector: 'bfp-contact',
  imports: [Btn, Badge, Card, Field, Input, LucideDynamicIcon, ReactiveFormsModule],
  templateUrl: './contact.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  private readonly session = inject(SessionStore);
  private readonly tickets = inject(TicketsService);
  private readonly navigation = inject(ExternalNavigation);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  protected readonly icMail = LucideMail;
  protected readonly supportEmail = SUPPORT_EMAIL;

  protected readonly isAuthenticated = this.session.isAuthenticated;

  /**
   * ⚠️ Affichés en lecture seule et **jamais** envoyés : `tickets` déduit son
   * auteur de la session. Un champ saisissable promettrait le contraire.
   */
  protected readonly authorName = computed(() => {
    const user = this.session.user();
    if (!user) return '';
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  });
  protected readonly authorEmail = computed(() => this.session.user()?.email ?? '');

  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    // 3 caractères : la borne est celle du validateur serveur, reprise ici pour
    // que le refus se voie avant l'envoi plutôt qu'en 422 après.
    subject: ['', [Validators.required, Validators.minLength(3)]],
    body: ['', [Validators.required]],
  });

  protected readonly canSubmit = computed(() => this.isAuthenticated() && !this.sending());

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) this.form.enable({ emitEvent: false });
      else this.form.disable({ emitEvent: false });
    });
  }

  protected signIn(): void {
    this.navigation.go(`${this.apiBaseUrl}/auth/keycloak/redirect?app=public`);
  }

  protected submit(): void {
    if (this.form.invalid || !this.canSubmit()) return;

    this.sending.set(true);
    this.error.set(null);

    this.tickets.open(this.form.getRawValue()).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.form.reset();
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.error.set(messageOf(err, 'Envoi impossible pour le moment.'));
      },
    });
  }

  protected readonly channels: readonly Channel[] = [
    {
      icon: LucideMail,
      name: 'Email',
      value: SUPPORT_EMAIL,
    },
    {
      icon: LucideClock,
      name: 'Permanence',
      value: 'Mardi & jeudi, 12h30–14h · local BAE',
    },
    {
      icon: LucideShield,
      name: 'Adhésion / cotisation',
      value: ORGANISATION.email,
    },
  ];
}
