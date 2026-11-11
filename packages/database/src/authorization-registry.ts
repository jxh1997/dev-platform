/** 已发布的可授予操作；菜单不能创建 API 权限。 */
export const permissionRegistry = [
  ...['list', 'read', 'create', 'update', 'delete'].map((action) => ({
    code: `demo:record:${action}`,
    title: `设备台账 · ${action}`,
  })),
  ...[
    'list',
    'read',
    'create',
    'update',
    'assign-role',
    'reset-password',
    'sessions',
    'revoke-session',
  ].map((action) => ({
    code: `system:user:${action}`,
    title: `用户 · ${action}`,
  })),
  ...['list', 'create', 'update', 'delete', 'grant'].map((action) => ({
    code: `system:role:${action}`,
    title: `角色 · ${action}`,
  })),
  ...['list', 'create', 'update', 'delete'].map((action) => ({
    code: `system:menu:${action}`,
    title: `菜单 · ${action}`,
  })),
  { code: 'system:permission:list', title: '操作权限清单' },
];
export const pageRegistry: Record<
  string,
  { path: string; permission: string }
> = {
  '/demo/records/index': {
    path: '/demo/records',
    permission: 'demo:record:list',
  },
  '/system/users/index': {
    path: '/system/users',
    permission: 'system:user:list',
  },
  '/system/roles/index': {
    path: '/system/roles',
    permission: 'system:role:list',
  },
  '/system/menus/index': {
    path: '/system/menus',
    permission: 'system:menu:list',
  },
};
export const initialMenus = [
  {
    code: 'records',
    name: 'Records',
    title: '设备台账',
    component: '/demo/records/index',
    sort: 10,
  },
  {
    code: 'users',
    name: 'SystemUsers',
    title: '用户管理',
    component: '/system/users/index',
    sort: 20,
  },
  {
    code: 'roles',
    name: 'SystemRoles',
    title: '角色管理',
    component: '/system/roles/index',
    sort: 30,
  },
  {
    code: 'menus',
    name: 'SystemMenus',
    title: '菜单管理',
    component: '/system/menus/index',
    sort: 40,
  },
];
