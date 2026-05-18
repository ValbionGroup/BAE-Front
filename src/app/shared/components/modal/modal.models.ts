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

export interface RoleModalRole {
  id: number | null;
  name: string;
  requiredCount: number;
}

export interface MessageModalConfig extends BaseModal {
  type: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  message?: string;
  details?: string;
  actions?: ModalAction[];
}

export interface CreateEventModalConfig extends BaseModal {
  title?: string;
  message?: string;
  onCreate: (data: { name: string; date: string; time: string }) => void;
}

export interface DeleteModalConfig extends MessageBase {
  type: 'delete';
  confirmationText?: string;
  onConfirm: () => void;
}

export interface RolesModalConfig extends BaseModal {
  type: 'roles';
  title?: string;
  message?: string;
  roles: RoleModalRole[];
  onSave: (roles: RoleModalRole[]) => void;
}

export interface ComponentModalConfig<T = unknown> extends BaseModal {
  type: 'component';
  component: Type<T>;
  inputs?: Record<string, unknown>;
  width?: number;
}

export type ModalConfig =
  | MessageModalConfig
  | DeleteModalConfig
  | RolesModalConfig
  | ComponentModalConfig;
