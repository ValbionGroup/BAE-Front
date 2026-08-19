import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LucideEllipsis, LucideIconInput } from '@lucide/angular';
import { Btn, DropdownItem, DropdownService } from '@bae/ui';

export interface PageAction {
  readonly label: string;
  readonly icon?: LucideIconInput;
  readonly kind?: 'primary' | 'danger' | 'secondary' | 'outline' | 'ghost' | 'quiet';
  /** Reste un bouton visible sous `md`. La première suffit ; les suivantes vont au menu. */
  readonly primary?: boolean;
  readonly disabled?: boolean;
  /** Motif de la désactivation, montré tel quel à l'utilisateur. */
  readonly title?: string;
  readonly run: () => void;
}

/**
 * Actions de page projetées dans la topbar : tous les boutons au-dessus de `md`, la
 * seule action primaire plus un menu `⋯` en dessous — à 375 px, trois boutons libellés
 * poussent le titre de la page hors de l'écran.
 */
@Component({
  selector: 'bfd-page-actions',
  imports: [Btn, LucideEllipsis],
  templateUrl: './page-actions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageActions {
  readonly actions = input.required<readonly PageAction[]>();

  private readonly dropdown = inject(DropdownService);

  protected readonly primaryAction = computed(() => this.actions().find((a) => a.primary) ?? null);

  protected readonly overflowActions = computed(() => {
    const primary = this.primaryAction();
    return this.actions().filter((a) => a !== primary);
  });

  protected isPrimary(action: PageAction): boolean {
    return action === this.primaryAction();
  }

  protected openOverflow(event: MouseEvent): void {
    const items: DropdownItem[] = this.overflowActions().map((action) => ({
      type: 'action',
      label: action.label,
      icon: action.icon,
      // Une action indisponible reste listée et grisée : la faire disparaître se lit
      // comme un bug plutôt que comme un manque côté API.
      disabled: action.disabled,
      description: action.disabled ? action.title : undefined,
      onClick: action.run,
    }));

    this.dropdown.toggle({
      anchor: event.currentTarget as HTMLElement,
      items,
      placement: 'bottom-end',
    });
  }
}
