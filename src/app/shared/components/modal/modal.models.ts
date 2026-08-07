import { Type } from '@angular/core';
import type { JobPeriod } from '#core/models/job-period.model';

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

/**
 * One staffing line on an event: an existing job, and how many people it needs.
 *
 * `jobId` always refers to a job that already exists in the backend. Jobs are
 * created and renamed through administration, never from an event screen — so
 * there is no free-text name here, and no `null` id meaning "make a new one".
 */
export interface RoleModalRole {
  jobId: number;
  requiredCount: number;
}

/** A job available to be staffed on an event. */
export interface RoleModalJob {
  id: number;
  name: string;
  /** The moment of the soirée this job belongs to. Staffing a soirée without
   *  seeing it is how one ends up with nobody on the rangement. */
  period: JobPeriod;
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
  /** Every job defined in the backend — the only things selectable here. */
  availableJobs: RoleModalJob[];
  onSave: (roles: RoleModalRole[]) => void;
}

export interface ComponentModalConfig<T = unknown> extends BaseModal {
  type: 'component';
  component: Type<T>;
  inputs?: Record<string, unknown>;
  width?: number;
}

export type ModalConfig =
  MessageModalConfig | DeleteModalConfig | RolesModalConfig | ComponentModalConfig;
