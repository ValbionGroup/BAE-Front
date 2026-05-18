import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideCalendar,
  LucideCheck,
  LucideDynamicIcon,
  LucideFlame,
  LucideIconInput,
  LucideQrCode,
  LucideSettings,
  LucideTicket,
  LucideTriangleAlert,
  LucideUsers,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';

interface Notif {
  readonly id: string;
  readonly icon: LucideIconInput;
  readonly col: 'warn' | 'blue' | 'ok' | 'danger' | 'red';
  readonly t: string;
  readonly s: string;
  readonly w: string;
  un: boolean;
}

@Component({
  selector: 'bfd-notifications',
  imports: [Btn, LucideDynamicIcon],
  templateUrl: './notifications.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notifications {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    // Subtitle re-renders when notifs mutate; updating it via the service
    // would clear the actions template, so the count is shown inline instead.
    this.pageHeader.set({
      title: 'Notifications',
      subtitle: '2 non lues',
      breadcrumb: ['Espace', 'Notifications'],
      activeNavId: 'home',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icCheck = LucideCheck;
  protected readonly icSettings = LucideSettings;

  protected readonly activeTab = signal(0);

  protected readonly notifs = signal<readonly Notif[]>([
    {
      id: 'pres',
      icon: LucideCalendar,
      col: 'warn',
      t: 'Rappel présence — Soirée Hivernale',
      s: "Tu n'as pas encore répondu. J-3.",
      w: 'il y a 1h',
      un: true,
    },
    {
      id: 'tick',
      icon: LucideTicket,
      col: 'blue',
      t: 'Ticket T-184 mis à jour',
      s: 'Le pôle web a marqué ton ticket "en cours".',
      w: 'il y a 3h',
      un: true,
    },
    {
      id: 'aff',
      icon: LucideUsers,
      col: 'ok',
      t: 'Tu es affectée à la Caisse',
      s: 'Soirée Hivernale · 19:30 — 22:00 · zone B',
      w: 'il y a 4h',
      un: false,
    },
    {
      id: 'lot',
      icon: LucideTriangleAlert,
      col: 'danger',
      t: 'Lot L23-117 proche péremption',
      s: 'Saucisses Strasbourg · DLC dans 2 jours.',
      w: 'hier',
      un: false,
    },
    {
      id: 'pre',
      icon: LucideQrCode,
      col: 'blue',
      t: 'Nouvelle précommande #218',
      s: 'Manon B. · Pack solo · 8,50 €',
      w: 'hier',
      un: false,
    },
    {
      id: 'fire',
      icon: LucideFlame,
      col: 'red',
      t: 'Objectif atteint 🎉',
      s: 'La soirée Bienvenue a dépassé 1 200 € (+18%).',
      w: '24/01',
      un: false,
    },
  ]);

  protected readonly unreadCount = computed(() => this.notifs().filter((n) => n.un).length);

  protected readonly tabs = computed<ReadonlyArray<readonly [string, number]>>(() => [
    ['Notifications', this.notifs().length],
    ['Messages', 0],
  ]);

  protected markAllRead(): void {
    this.notifs.update((arr) => arr.map((n) => ({ ...n, un: false })));
  }

  protected markRead(id: string): void {
    this.notifs.update((arr) => arr.map((n) => (n.id === id ? { ...n, un: false } : n)));
  }

  protected iconBg(col: Notif['col']): string {
    return {
      warn: 'bg-warn-soft text-warn',
      blue: 'bg-blue-soft text-blue',
      ok: 'bg-ok-soft text-ok',
      danger: 'bg-danger-soft text-danger',
      red: 'bg-red-soft text-red',
    }[col];
  }
}
