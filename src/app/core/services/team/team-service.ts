import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

// All fields are camelCase: the apiResponseCaseInterceptor converts snake_case responses automatically.
// Shapes below were verified against a live backend (AdonisJS 7, `GET /v1/{members,roles,permissions,logs}`).

/**
 * Role shape as embedded in a member by `GET /members`, which preloads the role WITHOUT
 * its permissions. No `permissions` field here on purpose: see `ApiTeamRoleWithPermissions`
 * for the `GET /roles` shape, which does carry them.
 */
export interface ApiTeamRole {
  id: number;
  name: string;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * `GET /roles` row. Distinct from `ApiTeamRole` on purpose: the role embedded in a
 * member by `GET /members` is preloaded WITHOUT its permissions, so making the field
 * optional on the shared type would let a missing preload pass as "grants nothing".
 */
export interface ApiTeamRoleWithPermissions extends ApiTeamRole {
  permissions: ApiTeamPermission[];
}

/**
 * `GET /members` row. WARNING: `role` is an OBJECT (preloaded relation), never a string.
 * Read `role.name` for display and handle `role === null` (members without a role exist).
 */
export interface ApiTeamMember {
  id: number;
  firstName: string;
  lastName: string;
  roleId: number | null;
  points: number;
  createdAt: string | null;
  updatedAt: string | null;
  role: ApiTeamRole | null;
}

/**
 * `GET /permissions` row. The primary key is the `permission` string itself
 * (`Permission.primaryKey = 'permission'`), there is no numeric id.
 * Values look like `resource:action`, e.g. `stock:read`, `supplier:update`.
 */
export interface ApiTeamPermission {
  permission: string;
  createdAt: string | null;
  updatedAt: string | null;
}

/** User embedded in a log through `preload('user')`. Users carry no first/last name. */
export interface ApiTeamLogUser {
  id: number;
  casId: string | null;
  email: string;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * `meta` is a free-form JSON column. In practice the request logger stores the HTTP
 * status, the duration and a copy of the response body. `response` is deliberately
 * typed `unknown`: nothing in this page reads it.
 */
export interface ApiTeamLogMeta {
  status?: number;
  durationMs?: number;
  response?: unknown;
}

/** `GET /logs` row, with `user` preloaded (null for anonymous / deleted users). */
export interface ApiTeamLog {
  id: number;
  level: string;
  message: string;
  method: string;
  url: string;
  ip: string;
  userId: number | null;
  meta: ApiTeamLogMeta | null;
  createdAt: string | null;
  user: ApiTeamLogUser | null;
}

/**
 * Corps de `PATCH /members/:id`. Les trois champs sont optionnels et le corps
 * est un delta : ce qui n'y figure pas n'est pas touché. `roleId: null` signifie
 * « sans rôle » et n'est donc pas équivalent à son absence.
 */
export interface UpdateMemberPatch {
  firstName?: string;
  lastName?: string;
  roleId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getMembers(): Observable<ApiTeamMember[]> {
    return this.http.get<ApiTeamMember[]>(`${this.baseUrl}/members`);
  }

  getRoles(): Observable<ApiTeamRoleWithPermissions[]> {
    return this.http.get<ApiTeamRoleWithPermissions[]>(`${this.baseUrl}/roles`);
  }

  getPermissions(): Observable<ApiTeamPermission[]> {
    return this.http.get<ApiTeamPermission[]>(`${this.baseUrl}/permissions`);
  }

  /**
   * Remplace la liste complète des permissions d'un rôle. Le corps n'est pas un
   * delta : ce qui n'y figure pas est révoqué, ce qui rend l'appel idempotent.
   */
  updateRolePermissions(
    roleId: number,
    permissions: readonly string[],
  ): Observable<ApiTeamRoleWithPermissions> {
    return this.http.put<ApiTeamRoleWithPermissions>(`${this.baseUrl}/roles/${roleId}/permissions`, {
      permissions,
    });
  }

  /**
   * `GET /logs` paginates server-side (50 rows per page by default, 200 max) and this
   * call sends neither `page` nor `limit`, so it silently gets the default first page —
   * the most recent entries, newest first — not the whole table. The Équipe page's
   * audit panel only ever shows that first page.
   */
  getLogs(): Observable<ApiTeamLog[]> {
    return this.http.get<ApiTeamLog[]>(`${this.baseUrl}/logs`);
  }

  /**
   * `PATCH` et non `PUT` : le corps est partiel. La route accepte les deux verbes
   * (`router.route(path, ['PUT','PATCH'], …)`), mais `PUT` annoncerait un
   * remplacement complet que ce corps ne porte pas.
   */
  updateMember(id: number, patch: UpdateMemberPatch): Observable<ApiTeamMember> {
    return this.http.patch<ApiTeamMember>(`${this.baseUrl}/members/${id}`, patch);
  }

  /** Supprime le membre ET son compte utilisateur : le back ne dissocie pas les deux. */
  deleteMember(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/members/${id}`);
  }
}
