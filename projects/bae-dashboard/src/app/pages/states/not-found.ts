import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideHouse, LucideSearch, LucideTicket } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '@bae/ui';

const RAIN_CELL_WIDTH = 38;
const RAIN_LINE_HEIGHT = 24;

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

    if (typeof window !== 'undefined') {
      const onResize = () => this.viewport.set({ w: window.innerWidth, h: window.innerHeight });
      window.addEventListener('resize', onResize);
      inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize));
    }
  }

  protected readonly icHome = LucideHouse;
  protected readonly icSearch = LucideSearch;
  protected readonly icTicket = LucideTicket;

  protected readonly requestedUrl = inject(Router).url;
  protected readonly requestedAt = this.formatTimestamp(new Date());

  private readonly viewport = signal({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  protected readonly rainRows = computed(() =>
    Array.from({ length: Math.ceil(this.viewport().h / RAIN_LINE_HEIGHT) + 2 }, (_, i) => i),
  );
  protected readonly rainCols = computed(() =>
    Array.from({ length: Math.ceil(this.viewport().w / RAIN_CELL_WIDTH) + 2 }, (_, i) => i),
  );

  private formatTimestamp(date: Date): string {
    const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `-${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }
}
