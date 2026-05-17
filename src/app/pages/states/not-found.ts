import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
}
