import { EntityManager } from 'typeorm';
import { Role, RegisteredPermission } from '../../../database/src';

/** 单次查询解析有效角色操作范围；ALL 只覆盖同一操作的 SELF。 */
export async function resolveAuthorization(em: EntityManager, userId: string) {
  const rows: {
    code: string;
    name: string;
    isSuperAdmin: number;
    permission: string | null;
    scope: 'ALL' | 'SELF' | null;
  }[] = await em.query(
    `SELECT r.code,r.name,r.is_super_admin AS isSuperAdmin,p.code AS permission,rp.scope
    FROM sys_user_role ur JOIN sys_role r ON r.id=ur.role_id AND r.enabled=1
    LEFT JOIN sys_role_permission rp ON rp.role_id=r.id
    LEFT JOIN sys_permission p ON p.code=rp.code AND p.enabled=1
    WHERE ur.user_id=?`,
    [userId],
  );
  const permissions: Record<string, 'ALL' | 'SELF'> = {};
  for (const row of rows)
    if (row.permission && (row.scope === 'ALL' || row.scope === 'SELF')) {
      if (permissions[row.permission] !== 'ALL')
        permissions[row.permission] = row.scope;
    }
  return {
    permissions,
    roles: [...new Set(rows.map((r) => r.code))],
    isSuperAdmin: rows.some((r) => Boolean(r.isSuperAdmin)),
  };
}

export async function registeredPermissions(em: EntityManager) {
  return em.find(RegisteredPermission, {
    where: { enabled: true },
    order: { code: 'ASC' },
  });
}
export async function isAdministrative(em: EntityManager, userId: string) {
  const auth = await resolveAuthorization(em, userId);
  return (
    auth.isSuperAdmin ||
    Object.keys(auth.permissions).some((code) => code.startsWith('system:'))
  );
}
export async function effectiveAdminCount(em: EntityManager) {
  return em
    .getRepository(Role)
    .createQueryBuilder('r')
    .innerJoin('sys_user_role', 'ur', 'ur.role_id=r.id')
    .innerJoin('sys_user', 'u', 'u.id=ur.user_id AND u.enabled=1')
    .where('r.enabled=1 AND r.is_super_admin=1')
    .getCount();
}
