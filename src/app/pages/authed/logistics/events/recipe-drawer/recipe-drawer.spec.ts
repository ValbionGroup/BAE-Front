import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecipeDrawer } from './recipe-drawer';
import { AvailableRecipe, EventRecipe } from '../events.models';

const mockRecipes: AvailableRecipe[] = [
  { id: 1, name: 'Mojito', category: 'Cocktails' },
  { id: 2, name: 'Sangria', category: 'Cocktails' },
  { id: 3, name: 'Plateau apéro', category: 'Snacks' },
];

const editingRecipe: EventRecipe = {
  recipeId: 2,
  recipeName: 'Sangria',
  servings: 30,
  totalCost: 27.5,
};

describe(RecipeDrawer.name, () => {
  let component: RecipeDrawer;
  let fixture: ComponentFixture<RecipeDrawer>;

  async function createComponent(mode: 'add' | 'edit' | null, editing: EventRecipe | null = null) {
    await TestBed.configureTestingModule({
      imports: [RecipeDrawer],
    }).compileComponents();
    fixture = TestBed.createComponent(RecipeDrawer);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('availableRecipes', mockRecipes);
    fixture.componentRef.setInput('editingRecipe', editing);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('should create', async () => {
    await createComponent(null);
    expect(component).toBeTruthy();
  });

  it('does not render the overlay when mode is null', async () => {
    await createComponent(null);
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('renders the dialog when mode is "add"', async () => {
    await createComponent('add');
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
  });

  it('shows recipe list buttons in add mode', async () => {
    await createComponent('add');
    const buttons = fixture.nativeElement.querySelectorAll('ul button[aria-pressed]');
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toContain('Mojito');
  });

  it('shows read-only recipe name in edit mode', async () => {
    await createComponent('edit', editingRecipe);
    const listbox = fixture.nativeElement.querySelector('ul[aria-label="Recettes disponibles"]');
    expect(listbox).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sangria');
  });

  it('marks the selected recipe button as aria-pressed="true"', async () => {
    await createComponent('add');
    const buttons = fixture.nativeElement.querySelectorAll('button[aria-pressed]');
    buttons[1].click(); // click Sangria
    fixture.detectChanges();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('disables the Save button when no recipe is selected in add mode', async () => {
    await createComponent('add');
    const saveBtn = fixture.nativeElement.querySelector('button[disabled]');
    expect(saveBtn).toBeTruthy();
    expect(saveBtn.textContent).toContain('Enregistrer');
  });

  it('emits save with correct recipeId and servings', async () => {
    await createComponent('add');
    const emitted: { recipeId: number; servings: number }[] = [];
    component.save.subscribe((v: { recipeId: number; servings: number }) => emitted.push(v));
    // Select Mojito (id=1)
    const recipeBtn = fixture.nativeElement.querySelectorAll('button[aria-pressed]')[0];
    recipeBtn.click();
    fixture.detectChanges();
    // Change servings to 25
    const servingsInput = fixture.nativeElement.querySelector(
      '#drawer-servings',
    ) as HTMLInputElement;
    servingsInput.value = '25';
    servingsInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // Save
    const saveBtn = fixture.nativeElement.querySelector('.bg-violet-500');
    saveBtn.click();
    expect(emitted).toEqual([{ recipeId: 1, servings: 25 }]);
  });

  it('emits cancel when the Cancel button is clicked', async () => {
    await createComponent('add');
    let count = 0;
    component.cancel.subscribe(() => count++);
    const cancelBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.trim() === 'Annuler');
    cancelBtn?.click();
    expect(count).toBe(1);
  });

  it('filters recipes by search query', async () => {
    await createComponent('add');
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'mojito';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button[aria-pressed]');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toContain('Mojito');
  });
});
