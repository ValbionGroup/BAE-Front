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

export interface MessageModalConfig extends BaseModal {
  type: 'error' | 'success' | 'warning' | 'info';
  actions?: ModalAction[];
}

export interface DeleteModalConfig extends BaseModal {
  type: 'delete';
  confirmationText?: string;
  onConfirm: () => void;
}

export type ModalConfig = MessageModalConfig | DeleteModalConfig;
