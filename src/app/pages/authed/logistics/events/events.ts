import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { LucideCalendar } from '@lucide/angular';
import {
  AvailableRecipe,
  DrawerMode,
  DrawerSaveEvent,
  EventDetail,
  EventItem,
  EventRecipe,
} from './events.models';
import { EventList } from './event-list/event-list';
import { EventDetail as EventDetailComponent } from './event-detail/event-detail';
import { RecipeDrawer } from './recipe-drawer/recipe-drawer';

@Component({
  selector: 'bfd-events',
  imports: [LucideCalendar, EventList, EventDetailComponent, RecipeDrawer],
  templateUrl: './events.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Events {
  protected readonly selectedEventId = signal<number | null>(null);
  protected readonly showPast = signal(false);
  protected readonly drawerMode = signal<DrawerMode>(null);
  protected readonly editingRecipeId = signal<number | null>(null);

  protected readonly upcomingEvents = signal<EventItem[]>([
    { id: 1, name: 'Soirée BDE printemps', date: '2026-05-25', recipeCount: 0 },
    { id: 2, name: "Gala de fin d'année", date: '2026-06-14', recipeCount: 0 },
    { id: 3, name: 'Afterwork BTS', date: '2026-07-03', recipeCount: 0 },
  ]);

  protected readonly pastEvents = signal<EventItem[]>([
    { id: 4, name: 'Soirée Halloween', date: '2025-10-31', recipeCount: 3 },
    { id: 5, name: 'Réveillon 2026', date: '2025-12-31', recipeCount: 2 },
  ]);

  protected readonly availableRecipes = signal<AvailableRecipe[]>([
    { id: 1, name: 'Mojito', category: 'Cocktails' },
    { id: 2, name: 'Panaché', category: 'Cocktails' },
    { id: 3, name: 'Sangria', category: 'Cocktails' },
    { id: 4, name: 'Plateau apéro', category: 'Snacks' },
    { id: 5, name: 'Vodka Orange', category: 'Cocktails' },
  ]);

  protected readonly eventDetails = signal<EventDetail[]>([
    {
      id: 1,
      name: 'Soirée BDE printemps',
      date: '2026-05-25',
      recipes: [],
      shoppingList: { grandTotal: 0, byStore: [] },
    },
    {
      id: 2,
      name: "Gala de fin d'année",
      date: '2026-06-14',
      recipes: [],
      shoppingList: { grandTotal: 0, byStore: [] },
    },
    {
      id: 3,
      name: 'Afterwork BTS',
      date: '2026-07-03',
      recipes: [],
      shoppingList: { grandTotal: 0, byStore: [] },
    },
    {
      id: 4,
      name: 'Soirée Halloween',
      date: '2025-10-31',
      recipes: [
        { recipeId: 1, recipeName: 'Mojito', servings: 50, totalCost: 92.5 },
        { recipeId: 3, recipeName: 'Sangria', servings: 30, totalCost: 27.5 },
        { recipeId: 4, recipeName: 'Plateau apéro', servings: 20, totalCost: 16.5 },
      ],
      shoppingList: {
        grandTotal: 136.5,
        byStore: [
          {
            storeName: 'Lidl',
            storeTotal: 78.4,
            items: [
              { productName: 'Rhum 70cl', quantity: 5, unit: 'btl.', totalPrice: 44.5 },
              { productName: 'Eau gazeuse 1L', quantity: 12, unit: 'btl.', totalPrice: 6.6 },
              { productName: 'Vin rouge 75cl', quantity: 5, unit: 'btl.', totalPrice: 17.45 },
              { productName: 'Chips nature 150g', quantity: 10, unit: 'sachets', totalPrice: 7.5 },
              { productName: 'Eau minérale 50cl', quantity: 20, unit: 'btl.', totalPrice: 3.8 },
            ],
          },
          {
            storeName: 'Marché',
            storeTotal: 24.0,
            items: [
              { productName: 'Citron vert', quantity: 40, unit: 'pièces', totalPrice: 18.0 },
              { productName: 'Menthe fraîche', quantity: 5, unit: 'bottes', totalPrice: 6.0 },
            ],
          },
          {
            storeName: 'Auchan',
            storeTotal: 14.52,
            items: [
              { productName: 'Sirop de grenadine', quantity: 3, unit: 'btl.', totalPrice: 6.6 },
              { productName: "Jus d'orange 1L", quantity: 8, unit: 'briques', totalPrice: 7.92 },
            ],
          },
        ],
      },
    },
    {
      id: 5,
      name: 'Réveillon 2026',
      date: '2025-12-31',
      recipes: [
        { recipeId: 2, recipeName: 'Panaché', servings: 40, totalCost: 30.0 },
        { recipeId: 5, recipeName: 'Vodka Orange', servings: 60, totalCost: 84.0 },
      ],
      shoppingList: {
        grandTotal: 114.0,
        byStore: [
          {
            storeName: 'Lidl',
            storeTotal: 46.8,
            items: [
              { productName: 'Bière blonde 33cl', quantity: 40, unit: 'btl.', totalPrice: 26.0 },
              { productName: 'Eau gazeuse 1L', quantity: 8, unit: 'btl.', totalPrice: 4.4 },
              { productName: "Jus d'orange 1L", quantity: 10, unit: 'briques', totalPrice: 10.9 },
            ],
          },
          {
            storeName: 'Carrefour',
            storeTotal: 57.0,
            items: [{ productName: 'Vodka 70cl', quantity: 6, unit: 'btl.', totalPrice: 57.0 }],
          },
        ],
      },
    },
  ]);

  protected readonly visibleEvents = computed(() =>
    this.showPast() ? this.pastEvents() : this.upcomingEvents(),
  );

  protected readonly selectedEventDetail = computed(() => {
    const id = this.selectedEventId();
    if (id === null) return null;
    return this.eventDetails().find((e) => e.id === id) ?? null;
  });

  protected readonly editingRecipe = computed(() => {
    const detail = this.selectedEventDetail();
    const recipeId = this.editingRecipeId();
    if (!detail || recipeId === null) return null;
    return detail.recipes.find((r) => r.recipeId === recipeId) ?? null;
  });

  protected selectEvent(id: number): void {
    this.selectedEventId.set(id);
  }

  protected togglePast(): void {
    this.showPast.update((v) => !v);
    this.selectedEventId.set(null);
  }

  protected openAddDrawer(): void {
    this.editingRecipeId.set(null);
    this.drawerMode.set('add');
  }

  protected openEditDrawer(recipeId: number): void {
    this.editingRecipeId.set(recipeId);
    this.drawerMode.set('edit');
  }

  protected closeDrawer(): void {
    this.drawerMode.set(null);
    this.editingRecipeId.set(null);
  }

  protected saveRecipe(event: DrawerSaveEvent): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;
    const mode = this.drawerMode();

    this.eventDetails.update((details) =>
      details.map((d) => {
        if (d.id !== eventId) return d;
        if (mode === 'add') {
          const recipe = this.availableRecipes().find((r) => r.id === event.recipeId);
          if (!recipe) return d;
          const newRecipe: EventRecipe = {
            recipeId: event.recipeId,
            recipeName: recipe.name,
            servings: event.servings,
            totalCost: 0,
          };
          return { ...d, recipes: [...d.recipes, newRecipe] };
        }
        return {
          ...d,
          recipes: d.recipes.map((r) =>
            r.recipeId === event.recipeId ? { ...r, servings: event.servings } : r,
          ),
        };
      }),
    );
    this.syncRecipeCount(eventId);
    this.closeDrawer();
  }

  protected removeRecipe(recipeId: number): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;
    this.eventDetails.update((details) =>
      details.map((d) =>
        d.id !== eventId ? d : { ...d, recipes: d.recipes.filter((r) => r.recipeId !== recipeId) },
      ),
    );
    this.syncRecipeCount(eventId);
  }

  private syncRecipeCount(eventId: number): void {
    const count = this.eventDetails().find((d) => d.id === eventId)?.recipes.length ?? 0;
    const update = (list: EventItem[]) =>
      list.map((e) => (e.id === eventId ? { ...e, recipeCount: count } : e));
    this.upcomingEvents.update(update);
    this.pastEvents.update(update);
  }
}
