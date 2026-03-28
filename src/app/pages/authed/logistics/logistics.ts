import { Component } from '@angular/core';
import {PageSelector, PageSelectorComponent} from '#shared/components/page-selector/page-selector';
import {LucideCalendar, LucideChefHat, LucidePackage2, LucideStore, LucideUtensils} from '@lucide/angular';
import {AppRoutes} from '#app/app.routes';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'bfd-logistics',
  imports: [
    PageSelector,
    RouterOutlet
  ],
  templateUrl: './logistics.html'
})
export class Logistics {
  protected navigationPages: PageSelectorComponent[] = [
    { label: 'Stocks', icon: LucidePackage2, route: AppRoutes.logistics.stock },
    { label: 'Recettes & produits', icon: LucideChefHat, route: AppRoutes.logistics.recipes },
    { label: 'Comparateur', icon: LucideStore, route: AppRoutes.logistics.compare },
    { label: 'Soirées & courses', icon: LucideCalendar, route:  AppRoutes.logistics.events },
  ]

  private generateRouteForPage(end: string): string {
    return `${AppRoutes.logistics.base}/${end}`;
  }
}
