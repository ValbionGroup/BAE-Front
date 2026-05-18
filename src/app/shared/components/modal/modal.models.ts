export interface ModalAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface BaseModal {
  id: string;
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
  actions?: ModalAction[];
}

export interface DeleteModalConfig extends BaseModal {
  type: 'delete';
  confirmationText?: string;
  onConfirm: () => void;
}

export interface RolesModalConfig extends BaseModal {
  type: 'roles';
  roles: RoleModalRole[];
  onSave: (roles: RoleModalRole[]) => void;
}

export interface CreateEventModalConfig extends BaseModal {
  type: 'create-event';
  onCreate: (payload: { name: string; date: string; time: string }) => void;
}

export type ModalConfig =
  | MessageModalConfig
  | DeleteModalConfig
  | RolesModalConfig
  | CreateEventModalConfig;

export type ModalConfigInput =
  | Omit<MessageModalConfig, 'id'>
  | Omit<DeleteModalConfig, 'id'>
  | Omit<RolesModalConfig, 'id'>
  | Omit<CreateEventModalConfig, 'id'>;
