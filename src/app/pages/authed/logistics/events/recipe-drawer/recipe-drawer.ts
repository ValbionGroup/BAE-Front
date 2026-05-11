import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  afterNextRender,
  effect,
  inject,
  Injector,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { LucideSearch, LucideX } from '@lucide/angular';
import { AvailableRecipe, DrawerMode, DrawerSaveEvent, EventRecipe } from '../events.models';

@Component({
  selector: 'bfd-recipe-drawer',
  imports: [LucideSearch, LucideX],
  templateUrl: './recipe-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
  },
})
export class RecipeDrawer {
  mode = input.required<DrawerMode>();
  availableRecipes = input.required<AvailableRecipe[]>();
  editingRecipe = input<EventRecipe | null>(null);

  save = output<DrawerSaveEvent>();
  cancel = output<void>();

  @ViewChild('drawerPanel') drawerPanel?: ElementRef<HTMLElement>;

  private readonly injector = inject(Injector);

  protected readonly searchQuery = signal('');
  protected readonly selectedRecipeId = signal<number | null>(null);
  protected readonly servings = signal<number>(1);

  protected readonly isOpen = computed(() => this.mode() !== null);

  protected readonly filteredRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.availableRecipes();
    return this.availableRecipes().filter(
      (r) => r.name.toLowerCase().includes(query) || r.category.toLowerCase().includes(query),
    );
  });

  private readonly syncEffect = effect(() => {
    const editing = this.editingRecipe();
    const open = this.isOpen();
    if (editing) {
      this.selectedRecipeId.set(editing.recipeId);
      this.servings.set(editing.servings);
      this.searchQuery.set('');
    } else if (open) {
      this.selectedRecipeId.set(null);
      this.servings.set(1);
      this.searchQuery.set('');
    } else {
      // Drawer closed — reset to clean state
      this.selectedRecipeId.set(null);
      this.servings.set(1);
      this.searchQuery.set('');
    }
    if (open) {
      afterNextRender(() => this.drawerPanel?.nativeElement.focus(), {
        injector: this.injector,
      });
    }
  });

  protected selectRecipe(id: number): void {
    this.selectedRecipeId.set(id);
  }

  protected onServingsChange(event: Event): void {
    const num = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(num) && num > 0) {
      this.servings.set(num);
    }
  }

  protected onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected onSave(): void {
    const recipeId = this.selectedRecipeId();
    const servings = this.servings();
    if (recipeId === null || servings < 1) return;
    this.save.emit({ recipeId, servings });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onEscapeKey(): void {
    if (this.isOpen()) {
      this.cancel.emit();
    }
  }
}
