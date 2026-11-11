import type { MigrationInterface, QueryRunner } from 'typeorm';
import { SystemAuthorization1794355200000 } from '../migrations/1794355200000-system-authorization';
import {
  authorizationSchema,
  MigrationRecoveryError,
  validateAuthorizationSchema,
} from './authorization-schema';

/** 保留历史迁移名／源码，只对尚未记为成功的授权迁移进行验证后续跑。 */
export class RecoverableSystemAuthorization1794355200000 implements MigrationInterface {
  readonly name = 'SystemAuthorization1794355200000';
  async up(q: QueryRunner): Promise<void> {
    await validateAuthorizationSchema(q);
    const raw = q.query.bind(q);
    let seedTransactionStarted = false;
    const resume: QueryRunner['query'] = async (
      ...args: Parameters<QueryRunner['query']>
    ) => {
      const [sql, parameters] = args;
      const added =
        /^ALTER TABLE (sys_user|sys_session) ADD (version|revoked_reason)\b/.exec(
          sql,
        );
      if (added && (await q.hasColumn(added[1]!, added[2]!))) return [];
      const created = /^CREATE TABLE (sys_[a-z_]+)\b/.exec(sql);
      if (
        created &&
        authorizationSchema[created[1]!] &&
        (await q.hasTable(created[1]!))
      )
        return [];
      if (sql.startsWith('INSERT INTO sys_security_state ')) {
        const rows: { authz_epoch: string }[] = await raw(
          'SELECT authz_epoch FROM sys_security_state WHERE id=1',
        );
        if (rows.length) {
          if (BigInt(rows[0]!.authz_epoch) < 1n)
            throw new MigrationRecoveryError('sys_security_state.id=1');
          return [];
        }
      }
      if (sql.startsWith('INSERT INTO sys_permission (code,title) VALUES')) {
        // MySQL DDL 已结束外层实际事务，不能使用 startTransaction() 创建嵌套 savepoint。
        // 在最后一条 DDL 之后显式重启实际事务，使种子与 TypeORM 的成功迁移记录一起提交。
        if (!seedTransactionStarted) {
          await raw('START TRANSACTION');
          seedTransactionStarted = true;
        }
        const rows: { enabled: number }[] = await raw(
          'SELECT enabled FROM sys_permission WHERE code=?',
          [parameters?.[0]],
        );
        if (rows.length) {
          if (rows[0]!.enabled !== 1)
            throw new MigrationRecoveryError(
              'sys_permission 已有停用的注册权限',
            );
          return [];
        }
      }
      if (
        sql.startsWith(
          'INSERT INTO sys_menu (code,name,path,title,component,permission,type,sort) VALUES',
        )
      ) {
        const rows: {
          name: string;
          path: string;
          component: string;
          permission: string;
          type: string;
          parent_id: string | null;
        }[] = await raw(
          'SELECT name,path,component,permission,type,parent_id FROM sys_menu WHERE code=?',
          [parameters?.[0]],
        );
        if (rows.length) {
          const m = rows[0]!;
          if (
            m.name !== parameters?.[1] ||
            m.path !== parameters?.[2] ||
            m.component !== parameters?.[4] ||
            m.permission !== parameters?.[5] ||
            m.type !== 'page' ||
            m.parent_id !== null
          )
            throw new MigrationRecoveryError('sys_menu 已有页面映射');
          return [];
        }
      }
      if (
        sql ===
        "INSERT INTO sys_role (code,name,is_super_admin) VALUES ('super-admin','超级管理员',1)"
      ) {
        const rows: { is_super_admin: number; enabled: number }[] = await raw(
          "SELECT is_super_admin,enabled FROM sys_role WHERE code='super-admin'",
        );
        if (rows.length) {
          if (rows[0]!.is_super_admin !== 1 || rows[0]!.enabled !== 1)
            throw new MigrationRecoveryError('sys_role.super-admin');
          return [];
        }
      }
      if (sql.startsWith('INSERT INTO sys_user_role '))
        return raw(
          `${sql} WHERE NOT EXISTS (SELECT 1 FROM sys_user_role existing WHERE existing.user_id=${sql.includes('FROM sys_user u ') ? 'u.id' : 'p.user_id'} AND existing.role_id=r.id)`,
          parameters,
        );
      if (sql.startsWith('INSERT INTO sys_role_permission ')) {
        const superAdmin = sql.includes("WHERE r.code='super-admin'");
        const conflict: unknown[] = await raw(
          superAdmin
            ? "SELECT 1 FROM sys_role_permission rp JOIN sys_role r ON r.id=rp.role_id WHERE r.code='super-admin' AND rp.scope<>'ALL' LIMIT 1"
            : "SELECT 1 FROM sys_role_permission rp JOIN sys_role r ON r.id=rp.role_id LEFT JOIN sys_user_permission p ON r.code=CONCAT('legacy-',p.user_id) AND rp.code=p.code COLLATE utf8mb4_0900_as_cs WHERE r.code LIKE 'legacy-%' AND (p.code IS NULL OR rp.scope<>p.scope) LIMIT 1",
        );
        if (conflict.length)
          throw new MigrationRecoveryError('sys_role_permission 已有范围');
        return raw(
          `${sql} AND NOT EXISTS (SELECT 1 FROM sys_role_permission existing WHERE existing.role_id=r.id AND existing.code=p.code COLLATE utf8mb4_0900_as_cs)`,
          parameters,
        );
      }
      if (sql.startsWith('INSERT INTO sys_role_menu '))
        return raw(
          `${sql} AND NOT EXISTS (SELECT 1 FROM sys_role_menu existing WHERE existing.role_id=r.id AND existing.menu_id=m.id)`,
          parameters,
        );
      if (sql.startsWith('INSERT INTO sys_role (code,name) SELECT DISTINCT ')) {
        const conflict: unknown[] = await raw(
          "SELECT 1 FROM sys_role WHERE code LIKE 'legacy-%' AND is_super_admin<>0 LIMIT 1",
        );
        if (conflict.length)
          throw new MigrationRecoveryError('sys_role legacy 角色身份');
        return raw(
          `${sql} WHERE NOT EXISTS (SELECT 1 FROM sys_role existing WHERE existing.code=CONCAT('legacy-',sys_user_permission.user_id))`,
          parameters,
        );
      }
      return raw(...args);
    };
    // 代理仅替换该迁移的 query；不更改真实 QueryRunner，也不修改历史迁移文件。
    const runner = new Proxy(q, {
      get: (target, key, receiver) =>
        key === 'query' ? resume : Reflect.get(target, key, receiver),
    });
    await new SystemAuthorization1794355200000().up(runner);
    await validateAuthorizationSchema(q);
  }
  async down(): Promise<void> {
    await new SystemAuthorization1794355200000().down();
  }
}
