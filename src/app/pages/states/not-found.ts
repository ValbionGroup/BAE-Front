import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideHouse, LucideSearch, LucideTicket } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';

@Component({
  selector: 'bfd-not-found',
  imports: [Btn, RouterLink],
  templateUrl: './not-found.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Page introuvable',
      subtitle: '404 · route inconnue',
      breadcrumb: ['Erreur', '404'],
    });
  }

  protected readonly icHome = LucideHouse;
  protected readonly icSearch = LucideSearch;
  protected readonly icTicket = LucideTicket;

  protected readonly requestedUrl = inject(Router).url;
  protected readonly requestedAt = this.formatTimestamp(new Date());
  protected readonly rainCells = Array.from({ length: 800 }, (_, i) => i);

  private formatTimestamp(date: Date): string {
    const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `-${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }
}
