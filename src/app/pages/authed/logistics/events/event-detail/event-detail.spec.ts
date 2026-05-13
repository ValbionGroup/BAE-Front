import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { EventDetail } from './event-detail';
import { EventDetail as EventDetailModel } from '../events.models';

registerLocaleData(localeFr);

const emptyEvent: EventDetailModel = {
  id: 1,
  name: 'Soirée test',
  date: '2026-06-01',
  recipes: [],
  shoppingList: { grandTotal: 0, byStore: [] },
};

const eventWithRecipes: EventDetailModel = {
  id: 2,
  name: 'Soirée fête',
  date: '2026-07-14',
  recipes: [
    { recipeId: 1, recipeName: 'Mojito', servings: 20, totalCost: 37.0 },
    { recipeId: 3, recipeName: 'Sangria', servings: 10, totalCost: 9.17 },
  ],
  shoppingList: {
    grandTotal: 46.17,
    byStore: [
      {
        storeName: 'Lidl',
        storeTotal: 46.17,
        items: [{ productName: 'Rhum 70cl', quantity: 2, unit: 'btl.', totalPrice: 17.8 }],
      },
    ],
  },
};

describe(EventDetail.name, () => {
  let fixture: ComponentFixture<EventDetail>;

  async function createComponent(event: EventDetailModel) {
    await TestBed.configureTestingModule({
      imports: [EventDetail],
      providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }],
    }).compileComponents();
    fixture = TestBed.createComponent(EventDetail);
    fixture.componentRef.setInput('event', event);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  describe('with no recipes', () => {
    beforeEach(() => createComponent(emptyEvent));

    it('should create', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('shows the empty-recipe state', () => {
      const status = fixture.nativeElement.querySelector('[role="status"]');
      expect(status).toBeTruthy();
    });

    it('does not show the shopping list section', () => {
      const sections = fixture.nativeElement.querySelectorAll('section');
      // Only the recipes section should exist, not the shopping list
      expect(sections.length).toBe(1);
    });
  });

  describe('with recipes', () => {
    beforeEach(() => createComponent(eventWithRecipes));

    it('renders the recipe list', () => {
      const items = fixture.nativeElement.querySelectorAll(
        'ul[aria-label="Recettes de la soirée"] li',
      );
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('Mojito');
    });

    it('shows the shopping list section', () => {
      const heading = fixture.nativeElement.querySelector('h3.uppercase');
      // Find the shopping list heading
      const headings = Array.from(fixture.nativeElement.querySelectorAll('h3')) as HTMLElement[];
      const shoppingHeading = headings.find((h) => h.textContent?.includes('courses'));
      expect(shoppingHeading).toBeTruthy();
    });

    it('emits editRecipe with the correct recipeId', () => {
      const emitted: number[] = [];
      fixture.componentInstance.editRecipe.subscribe((id: number) => emitted.push(id));
      const editBtn = fixture.nativeElement.querySelector('[aria-label="Modifier Mojito"]');
      editBtn.click();
      expect(emitted).toEqual([1]);
    });

    it('emits removeRecipe with the correct recipeId', () => {
      const emitted: number[] = [];
      fixture.componentInstance.removeRecipe.subscribe((id: number) => emitted.push(id));
      const deleteBtn = fixture.nativeElement.querySelector('[aria-label="Supprimer Sangria"]');
      deleteBtn.click();
      expect(emitted).toEqual([3]);
    });
  });
});
