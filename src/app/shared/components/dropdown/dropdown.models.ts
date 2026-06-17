import type { LucideIconInput } from '@lucide/angular';
import type { Placement } from '@floating-ui/dom';

export interface DropdownItemAction {
  readonly type: 'action';
  readonly icon?: LucideIconInput;
  readonly label: string;
  readonly description?: string;
  readonly trailing?: string;
  readonly kbd?: string;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

export interface DropdownItemSeparator {
  readonly type: 'separator';
}

export type DropdownItem = DropdownItemAction | DropdownItemSeparator;

export interface DropdownConfig {
  readonly anchor: HTMLElement;
  readonly items: readonly DropdownItem[];
  readonly placement?: Placement;
  readonly width?: number;
  readonly header?: string;
  readonly emptyLabel?: string;
}

export interface OpenDropdown extends DropdownConfig {
  readonly id: string;
}
