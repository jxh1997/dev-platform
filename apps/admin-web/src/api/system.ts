import type { components } from '@dev-platform/contracts/openapi';
import { requestClient } from '#/api/request';
type Schemas = components['schemas'];
export type ManagedUser = Schemas['ManagedUserResponse'];
export type ManagedRole = Schemas['ManagedRoleResponse'];
export type ManagedMenu = Schemas['ManagedMenuResponse'];
export type SessionItem = Schemas['SessionResponse'];
export type Grant = Schemas['GrantDto'];
export type MenuInput = Schemas['CreateMenuDto'];
export type PageComponent = Schemas['PageComponentResponse'];
export type Query = { page: number; pageSize: number; search?: string };
export const systemApi = {
  users: (params: Query) =>
    requestClient.get<Schemas['UsersPageResponse']>('/system/users', {
      params,
    }),
  createUser: (data: Schemas['CreateUserDto'], key: string) =>
    requestClient.post<ManagedUser>('/system/users', data, {
      headers: { 'Idempotency-Key': key },
    }),
  updateUser: (id: string, data: Schemas['UpdateUserDto']) =>
    requestClient.post<ManagedUser>(`/system/users/${id}/update`, data),
  assignRoles: (id: string, data: Schemas['AssignRolesDto']) =>
    requestClient.post<ManagedUser>(`/system/users/${id}/assign-role`, data),
  resetPassword: (id: string, data: Schemas['ResetPasswordDto']) =>
    requestClient.post(`/system/users/${id}/reset-password`, data),
  roles: (params: Query) =>
    requestClient.get<Schemas['RolesPageResponse']>('/system/roles', {
      params,
    }),
  createRole: (data: Schemas['CreateRoleDto'], key: string) =>
    requestClient.post<ManagedRole>('/system/roles', data, {
      headers: { 'Idempotency-Key': key },
    }),
  updateRole: (id: string, data: Schemas['UpdateRoleDto']) =>
    requestClient.post<ManagedRole>(`/system/roles/${id}/update`, data),
  grantRole: (id: string, data: Schemas['RoleGrantsDto']) =>
    requestClient.post<ManagedRole>(`/system/roles/${id}/grants`, data),
  deleteRole: (id: string, version: number) =>
    requestClient.post(`/system/roles/${id}/delete`, { version }),
  permissions: () =>
    requestClient.get<Schemas['PermissionResponse'][]>('/system/permissions'),
  components: () =>
    requestClient.get<PageComponent[]>('/system/page-components'),
  menus: (params: Query) =>
    requestClient.get<Schemas['MenusPageResponse']>('/system/menus', {
      params,
    }),
  createMenu: (data: MenuInput, key: string) =>
    requestClient.post<ManagedMenu>('/system/menus', data, {
      headers: { 'Idempotency-Key': key },
    }),
  updateMenu: (id: string, data: Schemas['UpdateMenuDto']) =>
    requestClient.post<ManagedMenu>(`/system/menus/${id}/update`, data),
  deleteMenu: (id: string, version: number) =>
    requestClient.post(`/system/menus/${id}/delete`, { version }),
  sessions: (userId?: string) =>
    requestClient.get<SessionItem[]>(
      userId ? `/system/users/${userId}/sessions` : '/auth/sessions',
    ),
  revokeSession: (sessionId: string, userId?: string) =>
    requestClient.post(
      userId
        ? `/system/users/${userId}/revoke-session`
        : '/auth/sessions/revoke',
      { sessionId },
    ),
};
/** 选择器逐页加载，不因列表页大小而静默丢失已分配关系。 */
export async function allOptions<T>(
  load: (query: Query) => Promise<{ list: T[]; total: number }>,
) {
  const rows: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await load({ page, pageSize: 100 });
    rows.push(...result.list);
    if (rows.length >= result.total) return rows;
  }
  throw new Error('选项超过 10000 条，请缩小管理范围');
}
