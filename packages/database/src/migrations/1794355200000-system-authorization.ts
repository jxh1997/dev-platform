import type { MigrationInterface, QueryRunner } from 'typeorm';
/** 已发布的可授予操作；菜单不能创建 API 权限。 */
const permissionRegistry = [
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
const pageRegistry: Record<string, { path: string; permission: string }> = {
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
const initialMenus = [
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

export class SystemAuthorization1794355200000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    const unsupported: unknown[] = await q.query(
      "SELECT user_id FROM sys_user_permission WHERE scope NOT IN ('ALL','SELF') OR code NOT IN (" +
        permissionRegistry.map(() => '?').join(',') +
        ') LIMIT 1',
      permissionRegistry.map((p) => p.code),
    );
    if (unsupported.length)
      throw new Error(
        '旧授权包含未注册权限或不支持范围，迁移前需人工核对，不静默丢弃',
      );
    await q.query('ALTER TABLE sys_user ADD version INT NOT NULL DEFAULT 1');
    await q.query(
      'ALTER TABLE sys_session ADD revoked_reason VARCHAR(64) NULL',
    );
    await q.query(
      `CREATE TABLE sys_security_state (id INT PRIMARY KEY, authz_epoch BIGINT UNSIGNED NOT NULL DEFAULT 1) ENGINE=InnoDB`,
    );
    await q.query(
      'INSERT INTO sys_security_state (id,authz_epoch) VALUES (1,1)',
    );
    await q.query(
      `CREATE TABLE sys_role (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(64) COLLATE utf8mb4_0900_as_cs NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, enabled TINYINT NOT NULL DEFAULT 1, is_super_admin TINYINT NOT NULL DEFAULT 0, version INT NOT NULL DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await q.query(
      `CREATE TABLE sys_permission (code VARCHAR(100) COLLATE utf8mb4_0900_as_cs PRIMARY KEY, title VARCHAR(100) NOT NULL, enabled TINYINT NOT NULL DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await q.query(
      `CREATE TABLE sys_user_role (user_id BIGINT UNSIGNED NOT NULL, role_id BIGINT UNSIGNED NOT NULL, PRIMARY KEY(user_id,role_id), FOREIGN KEY(user_id) REFERENCES sys_user(id), FOREIGN KEY(role_id) REFERENCES sys_role(id)) ENGINE=InnoDB`,
    );
    await q.query(
      `CREATE TABLE sys_role_permission (role_id BIGINT UNSIGNED NOT NULL, code VARCHAR(100) COLLATE utf8mb4_0900_as_cs NOT NULL, scope VARCHAR(8) NOT NULL, PRIMARY KEY(role_id,code), FOREIGN KEY(role_id) REFERENCES sys_role(id), FOREIGN KEY(code) REFERENCES sys_permission(code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await q.query(
      `CREATE TABLE sys_menu (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(64) COLLATE utf8mb4_0900_as_cs NOT NULL UNIQUE, parent_id BIGINT UNSIGNED NULL, name VARCHAR(100) COLLATE utf8mb4_0900_as_cs NOT NULL UNIQUE, path VARCHAR(250) COLLATE utf8mb4_0900_as_cs NOT NULL UNIQUE, title VARCHAR(100) NOT NULL, component VARCHAR(100) NOT NULL, permission VARCHAR(100) NOT NULL, type VARCHAR(16) NOT NULL, sort INT NOT NULL DEFAULT 0, visible TINYINT NOT NULL DEFAULT 1, enabled TINYINT NOT NULL DEFAULT 1, version INT NOT NULL DEFAULT 1, FOREIGN KEY(parent_id) REFERENCES sys_menu(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await q.query(
      `CREATE TABLE sys_role_menu (role_id BIGINT UNSIGNED NOT NULL, menu_id BIGINT UNSIGNED NOT NULL, PRIMARY KEY(role_id,menu_id), FOREIGN KEY(role_id) REFERENCES sys_role(id), FOREIGN KEY(menu_id) REFERENCES sys_menu(id)) ENGINE=InnoDB`,
    );
    for (const p of permissionRegistry)
      await q.query('INSERT INTO sys_permission (code,title) VALUES (?,?)', [
        p.code,
        p.title,
      ]);
    for (const m of initialMenus)
      await q.query(
        "INSERT INTO sys_menu (code,name,path,title,component,permission,type,sort) VALUES (?,?,?,?,?,?,'page',?)",
        [
          m.code,
          m.name,
          pageRegistry[m.component]!.path,
          m.title,
          m.component,
          pageRegistry[m.component]!.permission,
          m.sort,
        ],
      );
    await q.query(
      "INSERT INTO sys_role (code,name,is_super_admin) VALUES ('super-admin','超级管理员',1)",
    );
    // 仅初始化审计确认的账号提升；持有 ALL 台账权限不代表管理员。
    await q.query(
      "INSERT INTO sys_user_role (user_id,role_id) SELECT DISTINCT u.id,r.id FROM sys_user u JOIN sys_audit a ON a.user_id=u.id AND a.action='system:admin:init' JOIN sys_role r ON r.code='super-admin'",
    );
    await q.query(
      "INSERT INTO sys_role_permission (role_id,code,scope) SELECT r.id,p.code,'ALL' FROM sys_role r CROSS JOIN sys_permission p WHERE r.code='super-admin'",
    );
    await q.query(
      "INSERT INTO sys_role_menu (role_id,menu_id) SELECT r.id,m.id FROM sys_role r CROSS JOIN sys_menu m WHERE r.code='super-admin'",
    );
    // 冻结旧直接授权至独立兼容角色；保留原表作为升级证据，运行时不再读取。
    await q.query(
      "INSERT INTO sys_role (code,name) SELECT DISTINCT CONCAT('legacy-',user_id),CONCAT('兼容角色 ',user_id) FROM sys_user_permission",
    );
    await q.query(
      "INSERT INTO sys_user_role (user_id,role_id) SELECT DISTINCT p.user_id,r.id FROM sys_user_permission p JOIN sys_role r ON r.code=CONCAT('legacy-',p.user_id)",
    );
    await q.query(
      "INSERT INTO sys_role_permission (role_id,code,scope) SELECT r.id,p.code,p.scope FROM sys_user_permission p JOIN sys_role r ON r.code=CONCAT('legacy-',p.user_id) JOIN sys_permission known ON known.code=p.code COLLATE utf8mb4_0900_as_cs WHERE p.scope IN ('ALL','SELF')",
    );
    await q.query(
      "INSERT INTO sys_role_menu (role_id,menu_id) SELECT r.id,m.id FROM sys_role r JOIN sys_role_permission p ON p.role_id=r.id AND p.code='demo:record:list' JOIN sys_menu m ON m.code='records' WHERE r.code LIKE 'legacy-%'",
    );
  }
  async down(): Promise<void> {
    throw new Error('授权迁移不自动删表回退；使用经验证的前滚或备份恢复。');
  }
}
