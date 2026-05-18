import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { RoleModalRole, RolesModalConfig } from '../modal.models';

@Component({
  selector: 'bfd-roles-modal',
  imports: [LucideX, LucidePlus, LucideTrash2, Btn],
  templateUrl: './roles-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesModal {
  config = input.required<RolesModalConfig>();
  close = output<void>();

  protected readonly draft = signal<RoleModalRole[]>([]);
  protected readonly canSave = computed(() =>
    this.draft().every((role) => role.name.trim().length > 0 && role.requiredCount > 0),
  );

  constructor() {
    effect(() => {
      this.draft.set(this.config().roles.map((role) => ({ ...role })));
    });
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected addRole(): void {
    this.draft.update((roles) => [...roles, { id: null, name: '', requiredCount: 1 }]);
  }

  protected removeRole(index: number): void {
    this.draft.update((roles) => roles.filter((_, i) => i !== index));
  }

  protected onNameInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((roles) =>
      roles.map((role, i) => (i === index ? { ...role, name: value } : role)),
    );
  }

  protected onCountInput(index: number, event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const next = Number.isFinite(value) ? value : 0;
    this.draft.update((roles) =>
      roles.map((role, i) => (i === index ? { ...role, requiredCount: next } : role)),
    );
  }

  protected inputClass(invalid: boolean): string {
    const base =
      'w-full px-3 py-2 text-[13px] rounded-md bg-surface-2 text-text placeholder-muted focus:outline-none focus-visible:ring-2';
    const border = invalid
      ? 'border border-danger focus-visible:ring-danger/40'
      : 'border border-border focus-visible:ring-blue/40';
    return `${base} ${border}`;
  }

  protected onSave(): void {
    this.config().onSave(this.draft());
    this.close.emit();
  }
}
