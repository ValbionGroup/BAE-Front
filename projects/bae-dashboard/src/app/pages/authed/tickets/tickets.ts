import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { LucideDynamicIcon, LucideTicket, LucideTriangleAlert } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import {
  TicketsService,
  type TicketDetail,
  type TicketRow,
  type TicketStatus,
} from '#core/services/tickets/tickets-service';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Btn } from '#shared/components/ui/btn/btn';
import { Card } from '#shared/components/ui/card/card';

type LoadState = 'init' | 'loading' | 'loaded' | 'error';
type Tab = 'Tout' | 'Ouverts' | 'En cours' | 'Clos';

const TABS: readonly Tab[] = ['Tout', 'Ouverts', 'En cours', 'Clos'];

const STATUS_BADGE: Record<TicketStatus, { kind: BadgeKind; label: string }> = {
  open: { kind: 'warn', label: 'Ouvert' },
  in_progress: { kind: 'blue', label: 'En cours' },
  closed: { kind: 'neutral', label: 'Clos' },
};

@Component({
  selector: 'bfd-tickets',
  imports: [Btn, Badge, Card, ReactiveFormsModule, LucideDynamicIcon],
  templateUrl: './tickets.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class Tickets implements OnInit {
  private readonly service = inject(TicketsService);
  private readonly fb = inject(FormBuilder);

  protected readonly icTicket = LucideTicket;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly tabs = TABS;
  protected readonly activeTab = signal<Tab>('Tout');
  protected readonly loadState = signal<LoadState>('init');
  protected readonly loadError = signal<string | null>(null);
  protected readonly rows = signal<readonly TicketRow[]>([]);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly detail = signal<TicketDetail | null>(null);
  protected readonly composing = signal(false);

  protected readonly openForm = this.fb.group({
    subject: ['', [Validators.required, Validators.minLength(3)]],
    body: ['', Validators.required],
  });

  protected readonly replyForm = this.fb.group({
    body: ['', Validators.required],
  });

  constructor() {
    inject(PageHeaderService).set({
      title: 'Support · Tickets',
      subtitle: 'Vos demandes, et celles que vous traitez',
      breadcrumb: ['Support', 'Tickets'],
      activeNavId: 'tick',
    });

    // Charge le détail à chaque changement de sélection. Dépendre de
    // l'identifiant, pas de la ligne : la liste est remplacée après chaque
    // mutation, et en dépendre relancerait le chargement en boucle.
    effect(() => {
      const id = this.selectedId();
      if (id === null) {
        untracked(() => this.detail.set(null));
        return;
      }
      untracked(() => void this.loadDetail(id));
    });
  }

  ngOnInit(): void {
    void this.refresh();
  }

  protected readonly counts = computed(() => {
    const all = this.rows();
    return {
      total: all.length,
      open: all.filter((row) => row.status === 'open').length,
      inProgress: all.filter((row) => row.status === 'in_progress').length,
      closed: all.filter((row) => row.status === 'closed').length,
    };
  });

  protected readonly visible = computed<readonly TicketRow[]>(() => {
    const tab = this.activeTab();
    return this.rows().filter((row) => {
      if (tab === 'Ouverts') return row.status === 'open';
      if (tab === 'En cours') return row.status === 'in_progress';
      if (tab === 'Clos') return row.status === 'closed';
      return true;
    });
  });

  protected badge(status: TicketStatus): { kind: BadgeKind; label: string } {
    return STATUS_BADGE[status];
  }

  protected select(id: number): void {
    this.composing.set(false);
    this.selectedId.set(id);
  }

  protected startComposing(): void {
    this.selectedId.set(null);
    this.openForm.reset({ subject: '', body: '' });
    this.composing.set(true);
  }

  protected async submitTicket(): Promise<void> {
    if (this.openForm.invalid) return;
    const { subject, body } = this.openForm.value;

    const created = await lastValueFrom(
      this.service.open({ subject: subject!, body: body! }),
    ).catch(() => null);

    if (created === null) {
      this.loadError.set("Impossible d'ouvrir le ticket.");
      return;
    }

    this.composing.set(false);
    await this.refresh();
    this.selectedId.set(created.id);
  }

  protected async submitReply(): Promise<void> {
    const id = this.selectedId();
    if (id === null || this.replyForm.invalid) return;

    await lastValueFrom(this.service.reply(id, this.replyForm.value.body!)).catch(() => null);
    this.replyForm.reset({ body: '' });
    await this.loadDetail(id);
  }

  protected async setStatus(status: TicketStatus): Promise<void> {
    const id = this.selectedId();
    if (id === null) return;

    let refusal: string | null = null;
    try {
      await lastValueFrom(this.service.setStatus(id, status));
    } catch {
      // 403 sans `ticket:write` : réponse légitime du serveur, pas une panne.
      refusal = "Vous n'avez pas le droit de changer ce statut.";
    }

    // ⚠️ Le message est posé **après** la resynchronisation, jamais avant :
    // `refresh()` remet `loadError` à `null` en début de chargement, et l'ordre
    // inverse effaçait donc silencieusement le refus qu'on venait d'afficher.
    await this.refresh();
    await this.loadDetail(id);
    if (refusal !== null) this.loadError.set(refusal);
  }

  private async loadDetail(id: number): Promise<void> {
    try {
      this.detail.set(await lastValueFrom(this.service.get(id)));
    } catch {
      this.detail.set(null);
    }
  }

  private async refresh(): Promise<void> {
    this.loadState.set('loading');
    this.loadError.set(null);
    try {
      this.rows.set(await lastValueFrom(this.service.list()));
      this.loadState.set('loaded');
    } catch {
      this.rows.set([]);
      this.loadError.set('Impossible de charger les tickets.');
      this.loadState.set('error');
    }
  }
}
