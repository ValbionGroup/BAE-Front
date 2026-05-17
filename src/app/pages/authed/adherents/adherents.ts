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
  LucideCheck,
  LucideChevronRight,
  LucideDownload,
  LucideDynamicIcon,
  LucideEllipsis,
  LucideFunnel,
  LucideMail,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTriangleAlert,
  LucideUpload,
} from '@lucide/angular';
import { Router } from '@angular/router';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Input } from '#shared/components/ui/input/input';

interface Adherent {
  readonly id: string;
  readonly nom: string;
  readonly prom: string;
  readonly email: string;
  readonly coti: 'À jour' | 'Expirée' | 'Non-adhérent';
  readonly exp: string;
  readonly sold: number;
}

interface Cotisation {
  readonly an: string;
  readonly mont: string;
  readonly moyen: string;
  readonly date: string;
}

interface InfoRow {
  readonly k: string;
  readonly v: string;
}

interface StatTile {
  readonly k: string;
  readonly v: string;
  readonly negative?: boolean;
}

@Component({
  selector: 'bfd-adherents',
  imports: [Btn, Badge, Avatar, Input, LucideDynamicIcon],
  templateUrl: './adherents.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Adherents {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected verifyInCaisse(): void {
    this.router.navigate(['/caisse']);
  }

  constructor() {
    this.pageHeader.set({
      title: 'Adhérents',
      subtitle: '342 inscrits · 287 à jour · 41 expirations < 30j',
      breadcrumb: ['Espace', 'Adhérents'],
      activeNavId: 'adh',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icSearch = LucideSearch;
  protected readonly icFilter = LucideFunnel;
  protected readonly icDownload = LucideDownload;
  protected readonly icUpload = LucideUpload;
  protected readonly icPlus = LucidePlus;
  protected readonly icMore = LucideEllipsis;
  protected readonly icChevRight = LucideChevronRight;
  protected readonly icCheck = LucideCheck;
  protected readonly icMail = LucideMail;
  protected readonly icEdit = LucidePencil;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly filterTabs = [
    'Tous · 342',
    'À jour · 287',
    'Expirés · 41',
    'Externes · 14',
  ];
  protected readonly activeFilter = signal(0);
  protected readonly selectedIdx = signal(0);

  protected readonly adherents: readonly Adherent[] = [
    { id: 'ADH-2025-0142', nom: 'Camille Renard', prom: '2A · Alt.', email: 'c.renard@etu.ec.fr', coti: 'À jour', exp: '31/08/2026', sold: -2.5 },
    { id: 'ADH-2025-0118', nom: 'Antoine Picard', prom: '3A · Init.', email: 'a.picard@etu.ec.fr', coti: 'À jour', exp: '31/08/2026', sold: 0 },
    { id: 'ADH-2024-0871', nom: 'Sofia Lemaire', prom: '4A · Alt.', email: 's.lemaire@etu.ec.fr', coti: 'Expirée', exp: '31/08/2025', sold: 0 },
    { id: 'ADH-2025-0203', nom: 'Marwane B.', prom: '1A · Init.', email: 'm.bensaid@etu.ec.fr', coti: 'À jour', exp: '31/08/2026', sold: 0 },
    { id: 'ADH-2025-0089', nom: 'Élise Vasseur', prom: '5A · Alt.', email: 'e.vasseur@etu.ec.fr', coti: 'À jour', exp: '31/08/2026', sold: 12.0 },
    { id: 'EXT-2025-0011', nom: 'Pierre Aubry', prom: 'Ext. (invité)', email: 'p.aubry@gmail.com', coti: 'Non-adhérent', exp: '—', sold: 0 },
    { id: 'ADH-2025-0156', nom: 'Inès Dubreuil', prom: '2A · Alt.', email: 'i.dubreuil@etu.ec.fr', coti: 'À jour', exp: '31/08/2026', sold: -5.0 },
    { id: 'ADH-2025-0044', nom: 'Tom Bessière', prom: '3A · Alt.', email: 't.bessiere@etu.ec.fr', coti: 'À jour', exp: '31/08/2026', sold: 0 },
    { id: 'ADH-2024-0612', nom: 'Yasmine K.', prom: 'Alumni', email: 'yasmine.k@gmail.com', coti: 'Expirée', exp: '31/08/2025', sold: 0 },
  ];

  protected readonly selected = computed<Adherent>(() => this.adherents[this.selectedIdx()]);

  protected readonly infoRows = computed<readonly InfoRow[]>(() => {
    const s = this.selected();
    return [
      { k: 'Email', v: s.email },
      { k: 'Téléphone', v: '06 24 31 88 02' },
      { k: 'Promotion', v: s.prom },
      { k: 'Inscription', v: '12 sept. 2025' },
      { k: 'Expire le', v: s.exp },
    ];
  });

  protected readonly cotisations: readonly Cotisation[] = [
    { an: '2025-2026', mont: '15,00 €', moyen: 'Lydia', date: '12/09/2025' },
    { an: '2024-2025', mont: '15,00 €', moyen: 'Espèces', date: '03/10/2024' },
    { an: '2023-2024', mont: '12,00 €', moyen: 'Lydia', date: '21/09/2023' },
  ];

  protected readonly stats: readonly StatTile[] = [
    { k: 'Soirées', v: '6 / 9' },
    { k: 'Précommandes', v: '11' },
    { k: 'Dépensé', v: '124,50 €' },
    { k: 'Solde courant', v: '−2,50 €', negative: true },
  ];

  protected statusKind(coti: Adherent['coti']): BadgeKind {
    if (coti === 'À jour') return 'ok';
    if (coti === 'Expirée') return 'danger';
    return 'ghost';
  }

  protected solde(s: number): string {
    if (s === 0) return '—';
    return `${s > 0 ? '+' : ''}${s.toFixed(2).replace('.', ',')} €`;
  }

  protected soldeClass(s: number): string {
    if (s === 0) return 'text-muted';
    if (s < 0) return 'text-danger font-semibold';
    return 'text-ok font-semibold';
  }

  protected expClass(coti: Adherent['coti']): string {
    return coti === 'Expirée' ? 'text-danger' : 'text-text-2';
  }
}
