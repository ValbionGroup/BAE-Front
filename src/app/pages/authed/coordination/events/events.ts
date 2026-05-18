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
  LucideChefHat,
  LucideChevronDown,
  LucideClock,
  LucideDownload,
  LucideDynamicIcon,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { CoordinationNewModal } from '#shared/components/modal/coordination-new-modal/coordination-new-modal';
import { CoordinationDeleteModal } from '#shared/components/modal/coordination-delete-modal/coordination-delete-modal';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Field } from '#shared/components/ui/field/field';
import { Toggle } from '#shared/components/ui/toggle/toggle';

type EventStatus = 'preparing' | 'planning' | 'draft' | 'past';
type TabKey = 'upcoming' | 'drafts' | 'past';

interface CoordinationEvent {
  readonly id: string;
  readonly name: string;
  readonly date: string;
  readonly responsible: string;
  readonly status: EventStatus;
  readonly statusLabel: string;
  readonly statusKind: BadgeKind;
  readonly members: number;
  readonly maxMembers: number;
  readonly recipes: number;
}

interface OptionRow {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
  enabled: boolean;
}

interface EditState {
  readonly id: string;
  readonly statusLabel: string;
  readonly createdAt: string;
  readonly createdBy: string;
  name: string;
  date: string;
  time: string;
  location: string;
  expected: string;
  description: string;
  responsibleName: string;
  responsibleRole: string;
  recipes: string[];
  readonly options: OptionRow[];
}

@Component({
  selector: 'bfd-coordination-events',
  imports: [Btn, Badge, Input, Avatar, Field, Toggle, LucideDynamicIcon],
  templateUrl: './events.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationEvents {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly modals = inject(ModalService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Coordination',
      subtitle: 'Soirées · création & édition',
      breadcrumb: ['Préparation', 'Coordination', 'Soirées'],
      activeNavId: 'coord',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icCalendar = LucideCalendar;
  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icSearch = LucideSearch;
  protected readonly icEdit = LucidePencil;
  protected readonly icTrash = LucideTrash2;
  protected readonly icX = LucideX;
  protected readonly icCheck = LucideCheck;
  protected readonly icChef = LucideChefHat;
  protected readonly icChevDown = LucideChevronDown;
  protected readonly icClock = LucideClock;

  private readonly all: readonly CoordinationEvent[] = [
    {
      id: 'soiree-hivernale',
      name: 'Soirée Hivernale',
      date: '14/02/2026',
      responsible: 'Léa Marchand',
      status: 'preparing',
      statusLabel: 'En préparation',
      statusKind: 'warn',
      members: 11,
      maxMembers: 18,
      recipes: 5,
    },
    {
      id: 'soiree-carnaval',
      name: 'Soirée Carnaval',
      date: '07/03/2026',
      responsible: 'Thomas R.',
      status: 'preparing',
      statusLabel: 'En préparation',
      statusKind: 'warn',
      members: 0,
      maxMembers: 16,
      recipes: 3,
    },
    {
      id: 'repas-alternants',
      name: 'Repas Alternant·e·s',
      date: '28/03/2026',
      responsible: 'Camille D.',
      status: 'planning',
      statusLabel: 'Planification',
      statusKind: 'blue',
      members: 0,
      maxMembers: 12,
      recipes: 0,
    },
    {
      id: 'soiree-bienvenue',
      name: 'Soirée Bienvenue 2026',
      date: '24/01/2026',
      responsible: 'Léa Marchand',
      status: 'past',
      statusLabel: 'Passée',
      statusKind: 'ok',
      members: 18,
      maxMembers: 18,
      recipes: 4,
    },
  ];

  protected readonly activeTab = signal<TabKey>('upcoming');
  protected readonly selectedId = signal<string>('soiree-hivernale');

  protected readonly tabs = computed(() => {
    const upcoming = this.all.filter(
      (e) => e.status === 'preparing' || e.status === 'planning',
    ).length;
    const drafts = this.all.filter((e) => e.status === 'draft').length;
    const past = this.all.filter((e) => e.status === 'past').length;
    return [
      { key: 'upcoming' as TabKey, label: 'À venir', count: upcoming },
      { key: 'drafts' as TabKey, label: 'Brouillons', count: drafts },
      { key: 'past' as TabKey, label: 'Passées', count: past },
    ];
  });

  protected readonly visibleEvents = computed<readonly CoordinationEvent[]>(() => {
    const tab = this.activeTab();
    return this.all.filter((e) => {
      if (tab === 'upcoming') return e.status === 'preparing' || e.status === 'planning';
      if (tab === 'drafts') return e.status === 'draft';
      return e.status === 'past';
    });
  });

  protected readonly edit = signal<EditState>({
    id: 'soiree-hivernale',
    statusLabel: 'EN PRÉPARATION',
    createdAt: '02/02/2026',
    createdBy: 'Léa M.',
    name: 'Soirée Hivernale',
    date: '14/02/2026',
    time: '19:30 — 23:00',
    location: 'Foyer ENSEIRB — Talence',
    expected: '180',
    description:
      "Soirée d'hiver, hot-dogs + crêpes + boissons chaudes. Précommandes ouvertes jusqu'au 14/02 18:30.",
    responsibleName: 'Léa Marchand',
    responsibleRole: 'Trésorière',
    recipes: [
      'Hot-dog classique',
      'Hot-dog veggie',
      'Frites portion',
      'Crêpe Nutella',
      'Panaché 25cl',
    ],
    options: [
      {
        key: 'precommandes',
        label: 'Précommandes en ligne',
        hint: "Page publique active jusqu'à J-1 18:30",
        enabled: true,
      },
      {
        key: 'inscription',
        label: 'Inscription obligatoire',
        hint: 'Limite à 22 membres BAE pour le service',
        enabled: true,
      },
      {
        key: 'public',
        label: 'Soirée publique',
        hint: "Visible sur la page d'accueil publique",
        enabled: true,
      },
      {
        key: 'lock',
        label: 'Verrouiller le menu',
        hint: 'Empêche modification après J-2',
        enabled: false,
      },
    ],
  });

  protected openNew(): void {
    this.modals.open({ type: 'component', component: CoordinationNewModal });
  }

  protected openDelete(eventId: string): void {
    const ev = this.all.find((e) => e.id === eventId);
    this.modals.open({
      type: 'component',
      component: CoordinationDeleteModal,
      inputs: { eventName: ev?.name ?? 'cette soirée' },
    });
  }

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected setTab(key: TabKey): void {
    this.activeTab.set(key);
  }

  protected rowAccent(e: CoordinationEvent): { bg: string; text: string } {
    switch (e.status) {
      case 'preparing':
        return { bg: 'bg-red-soft', text: 'text-red' };
      case 'past':
        return { bg: 'bg-ok-soft', text: 'text-ok' };
      case 'draft':
        return { bg: 'bg-surface-3', text: 'text-muted' };
      default:
        return { bg: 'bg-blue-soft', text: 'text-blue' };
    }
  }

  protected updateName(v: string): void {
    this.edit.update((s) => ({ ...s, name: v }));
  }

  protected updateDate(v: string): void {
    this.edit.update((s) => ({ ...s, date: v }));
  }

  protected updateTime(v: string): void {
    this.edit.update((s) => ({ ...s, time: v }));
  }

  protected updateLocation(v: string): void {
    this.edit.update((s) => ({ ...s, location: v }));
  }

  protected updateExpected(v: string): void {
    this.edit.update((s) => ({ ...s, expected: v }));
  }

  protected updateDescription(ev: Event): void {
    const v = (ev.target as HTMLTextAreaElement).value;
    this.edit.update((s) => ({ ...s, description: v }));
  }

  protected toggleOption(key: string, enabled: boolean): void {
    this.edit.update((s) => ({
      ...s,
      options: s.options.map((o) => (o.key === key ? { ...o, enabled } : o)),
    }));
  }

  protected removeRecipe(name: string): void {
    this.edit.update((s) => ({ ...s, recipes: s.recipes.filter((r) => r !== name) }));
  }
}
