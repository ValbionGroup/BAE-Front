import { Type } from '@angular/core';

export interface ModalAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface BaseModal {
  id: string;
}

interface MessageBase extends BaseModal {
  title: string;
  message: string;
  details?: string;
}

export interface MessageModalConfig extends MessageBase {
  type: 'error' | 'success' | 'warning' | 'info';
  actions?: ModalAction[];
}

export interface DeleteModalConfig extends MessageBase {
  type: 'delete';
  confirmationText?: string;
  onConfirm: () => void;
}

// Component-projection modal. The component must expose:
//   - `id = input.required<string>()` — used to close itself via ModalService
//   - any additional inputs declared via `input()` / `input.required()`
// The container provides backdrop, stacking, focus trap, ESC handling.
export interface ComponentModalConfig<T = unknown> extends BaseModal {
  type: 'component';
  component: Type<T>;
  inputs?: Record<string, unknown>;
  width?: number;
}

export type ModalConfig =
  | MessageModalConfig
  | DeleteModalConfig
  | ComponentModalConfig;
