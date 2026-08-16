import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  LucideCalendar,
  LucideCheck,
  LucideDynamicIcon,
  LucideIconInput,
  LucideTicket,
  LucideTriangleAlert,
  LucideUsers,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import {
  NotificationsService,
  type ApiNotification,
} from '#core/services/notifications/notifications-service';
import { Btn } from '#shared/components/ui/btn/btn';

type LoadState = 'init' | 'loading' | 'loaded' | 'error';
type Tab = 'Toutes' | 'Non lues';

interface Notif {
  readonly id: number;
  readonly icon: LucideIconInput;
  readonly col: 'warn' | 'blue' | 'ok' | 'danger';
  readonly title: string;
  readonly detail: string;
  readonly when: string;
  readonly unread: boolean;
}

/**
 * Le `verb` porte le sens ; le libellé se décide ici, pas côté serveur.
 * Un verbe inconnu retombe sur un rendu générique plutôt que sur une case vide :
 * une notification qu'on ne sait pas nommer reste une notification à afficher.
 */
const PRESENTATION: Record<string, { icon: LucideIconInput; col: Notif['col']; title: string }> = {
  'presence.pending': { icon: LucideUsers, col: 'warn', title: 'Réponse attendue' },
  'presence.upcoming': { icon: LucideCalendar, col: 'blue', title: 'Participation à venir' },
  'stock.expiring': { icon: LucideTriangleAlert, col: 'danger', title: 'Péremption proche' },
  'ticket.opened': { icon: LucideTicket, col: 'blue', title: 'Nouveau ticket' },
  'ticket.updated': { icon: LucideTicket, col: 'ok', title: 'Ticket mis à jour' },
};

@Component({
  selector: 'bfd-notifications',
  imports: [Btn, LucideDynamicIcon],
  templateUrl: './notifications.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class Notifications implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly service = inject(NotificationsService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected readonly icCheck = LucideCheck;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly loadState = signal<LoadState>('init');
  protected readonly loadError = signal<string | null>(null);
  protected readonly activeTab = signal<Tab>('Toutes');
  private readonly raw = signal<readonly ApiNotification[]>([]);

  constructor() {
    this.pageHeader.set({
      title: 'Notifications',
      subtitle: 'Ce qui vous concerne',
      breadcrumb: ['Notifications'],
      activeNavId: 'notif',
    });

    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  ngOnInit(): void {
    void this.refresh();
  }

  protected readonly unreadCount = computed(
    () => this.raw().filter((notification) => notification.readAt === null).length,
  );

  protected readonly tabs = computed<readonly [Tab, number][]>(() => [
    ['Toutes', this.raw().length],
    ['Non lues', this.unreadCount()],
  ]);

  protected readonly notifs = computed<readonly Notif[]>(() => {
    const onlyUnread = this.activeTab() === 'Non lues';
    return this.raw()
      .filter((notification) => !onlyUnread || notification.readAt === null)
      .map(toNotif);
  });

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  protected async markRead(id: number): Promise<void> {
    const target = this.raw().find((notification) => notification.id === id);
    // Déjà lue : ne pas rappeler le serveur, il ne réécrirait pas la date de
    // toute façon — autant ne pas faire la requête.
    if (target === undefined || target.readAt !== null) return;

    try {
      const updated = await lastValueFrom(this.service.markRead(id));
      this.raw.update((list) =>
        list.map((notification) =>
          notification.id === id ? { ...notification, readAt: updated.readAt } : notification,
        ),
      );
    } catch {
      await this.refresh();
    }
  }

  protected async markAllRead(): Promise<void> {
    if (this.unreadCount() === 0) return;
    try {
      await lastValueFrom(this.service.markAllRead());
    } finally {
      // Rechargement même en cas d'échec : l'écran doit refléter la base, pas
      // l'issue optimiste d'une requête dont on ignore où elle s'est arrêtée.
      await this.refresh();
    }
  }

  private async refresh(): Promise<void> {
    this.loadState.set('loading');
    this.loadError.set(null);
    try {
      this.raw.set(await lastValueFrom(this.service.list()));
      this.loadState.set('loaded');
    } catch {
      this.raw.set([]);
      this.loadError.set('Impossible de charger les notifications.');
      this.loadState.set('error');
    }
  }
}

function toNotif(notification: ApiNotification): Notif {
  const preset = PRESENTATION[notification.verb];
  const payload = notification.payload;

  return {
    id: notification.id,
    icon: preset?.icon ?? LucideCalendar,
    col: preset?.col ?? 'blue',
    title: preset?.title ?? String(payload['subject'] ?? 'Notification'),
    detail: firstLine(payload),
    when: formatWhen(notification.occurredAt),
    unread: notification.readAt === null,
  };
}

function firstLine(payload: Record<string, unknown>): string {
  const lines = payload['lines'];
  if (Array.isArray(lines) && typeof lines[0] === 'string') return lines[0];
  const subject = payload['subject'];
  return typeof subject === 'string' ? subject : '';
}

function formatWhen(iso: string | null): string {
  if (iso === null) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 24) return `il y a ${Math.floor(minutes / 60)} h`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
