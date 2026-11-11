import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  QueryFailedError,
} from 'typeorm';
import { hash } from 'bcryptjs';
import { createHmac } from 'node:crypto';
import {
  Audit,
  Idempotency,
  Menu,
  Role,
  RoleMenu,
  RolePermission,
  SecurityState,
  Session,
  User,
  UserRole,
  pageRegistry,
} from '../../../database/src';
import {
  resolveAuthorization,
  isAdministrative,
  effectiveAdminCount,
  registeredPermissions,
} from '../auth/authorization';
import { fail, validId, type Principal } from '../common/http';
import {
  AssignRolesDto,
  CreateMenuDto,
  CreateRoleDto,
  CreateUserDto,
  ExpectedVersion,
  PageQuery,
  ResetPasswordDto,
  RoleGrantsDto,
  UpdateMenuDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './system.dto';

@Injectable()
export class SystemService {
  constructor(private readonly db: DataSource) {}

  /** 安全状态固定行先锁，重新读取操作者状态与授权，避免排队中的敏感请求使用旧授权。 */
  private async write<T>(
    p: Principal,
    permission: string,
    requestId: string,
    resourceId: string,
    run: (em: EntityManager, current: Principal) => Promise<T>,
    creation?: { key: string | undefined; input: unknown },
  ) {
    try {
      return await this.db.transaction(async (em) => {
        await em.findOneOrFail(SecurityState, {
          where: { id: 1 },
          lock: { mode: 'pessimistic_write' },
        });
        const user = await em.findOneBy(User, { id: p.userId, enabled: true });
        const session = await em.findOneBy(Session, {
          id: p.sessionId,
          userId: p.userId,
          revokedAt: IsNull(),
        });
        if (
          !user ||
          !session ||
          user.securityVersion !== p.securityVersion ||
          session.expiresAt.getTime() <= Date.now()
        )
          fail(401, 'AUTH_SESSION_REVOKED', '会话已失效');
        const current = { ...p, ...(await resolveAuthorization(em, p.userId)) };
        if (user.mustChangePassword || !current.permissions[permission])
          fail(403, 'AUTHZ_DENIED', '没有此操作权限');
        if (/system:(role|menu):|system:user:assign-role/.test(permission))
          this.super(current);
        if (
          permission === 'system:user:create' &&
          current.permissions[permission] !== 'ALL'
        )
          fail(403, 'AUTHZ_DENIED', '创建用户需要全部范围');
        let digest = '';
        if (creation) {
          if (!creation.key || !/^[A-Za-z0-9_-]{16,100}$/.test(creation.key))
            fail(
              400,
              'VALIDATION_FAILED',
              '新增操作需要有效的 Idempotency-Key',
            );
          digest = createHmac('sha256', process.env.JWT_SECRET!)
            .update(JSON.stringify(creation.input))
            .digest('hex');
          const previous = await em.findOneBy(Idempotency, {
            userId: p.userId,
            endpoint: permission,
            requestKey: creation.key,
          });
          if (previous) {
            if (previous.digest !== digest)
              fail(409, 'IDEMPOTENCY_CONFLICT', '幂等键已用于其他请求');
            return previous.response;
          }
        }
        const before = await this.auditSnapshot(em, permission, resourceId);
        const result = await run(em, current);
        const actualId =
          typeof result === 'object' &&
          result !== null &&
          'id' in result &&
          typeof result.id === 'string'
            ? result.id
            : resourceId;
        const after = await this.auditSnapshot(em, permission, actualId);
        if (creation)
          await em.insert(Idempotency, {
            userId: p.userId,
            endpoint: permission,
            requestKey: creation.key!,
            digest,
            response: JSON.parse(JSON.stringify(result)),
            createdAt: new Date(),
          });
        if ((await effectiveAdminCount(em)) === 0)
          fail(409, 'LAST_SUPER_ADMIN', '必须保留至少一个有效超级管理员');
        await em.increment(SecurityState, { id: 1 }, 'authzEpoch', 1);
        const audit = new Audit();
        Object.assign(audit, {
          userId: p.userId,
          action: permission,
          resourceId: actualId,
          requestId,
          details: {
            actor: { username: user.username, realName: user.realName },
            before,
            after,
          },
          createdAt: new Date(),
        });
        await em.save(audit);
        return result;
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        'code' in error.driverError &&
        error.driverError.code === 'ER_DUP_ENTRY'
      )
        fail(409, 'RESOURCE_CONFLICT', '账号、编码或路由已存在');
      throw error;
    }
  }
  private async auditSnapshot(
    em: EntityManager,
    permission: string,
    id: string,
  ): Promise<unknown> {
    if (!/^[1-9]\d{0,19}$/.test(id)) return null;
    if (permission.startsWith('system:user:')) {
      const user = await em.findOneBy(User, { id });
      return user ? this.userView(em, user) : null;
    }
    if (permission.startsWith('system:role:')) {
      const role = await em.findOneBy(Role, { id });
      return role ? this.roleView(em, role) : null;
    }
    if (permission.startsWith('system:menu:'))
      return em.findOneBy(Menu, { id });
    return null;
  }
  private super(p: Principal) {
    if (!p.isSuperAdmin)
      fail(403, 'AUTHZ_DENIED', '只有超级管理员可以执行授权与系统安全管理');
  }
  private async target(
    em: EntityManager,
    p: Principal,
    id: string,
    permission: string,
  ) {
    if (!p.permissions[permission]) fail(403, 'AUTHZ_DENIED', '没有此操作权限');
    const u = await em.findOneBy(User, { id: validId(id) });
    if (!u || (p.permissions[permission] !== 'ALL' && p.userId !== id))
      fail(404, 'RESOURCE_NOT_FOUND', '用户不存在或无权访问');
    if (!p.isSuperAdmin && (await isAdministrative(em, id)))
      fail(403, 'AUTHZ_DENIED', '不能管理管理员账号');
    return u;
  }
  private version(actual: number, expected: number) {
    if (actual !== expected)
      fail(409, 'VERSION_CONFLICT', '记录已更新，请重新加载后比较');
  }
  private async updateUser(
    em: EntityManager,
    user: User,
    data: Partial<User>,
    p: Principal,
    permission: string,
  ) {
    const query = em
      .createQueryBuilder()
      .update(User)
      .set({ ...data, version: user.version + 1 })
      .where('id=:id AND version=:version', {
        id: user.id,
        version: user.version,
      });
    if (p.permissions[permission] !== 'ALL')
      query.andWhere('id=:actorId', { actorId: p.userId });
    const result = await query.execute();
    if (result.affected !== 1)
      fail(409, 'VERSION_CONFLICT', '用户已变化，请重新加载');
  }
  private async userView(em: EntityManager, u: User) {
    const assignments = await em.findBy(UserRole, { userId: u.id });
    const auth = await resolveAuthorization(em, u.id);
    return {
      id: u.id,
      username: u.username,
      realName: u.realName,
      enabled: u.enabled,
      mustChangePassword: u.mustChangePassword,
      version: u.version,
      roleIds: assignments.map((r) => r.roleId),
      isSuperAdmin: auth.isSuperAdmin,
    };
  }
  async users(p: Principal, q: PageQuery) {
    if (!p.permissions['system:user:list'])
      fail(403, 'AUTHZ_DENIED', '没有此操作权限');
    const qb = this.db.getRepository(User).createQueryBuilder('u');
    if (p.permissions['system:user:list'] !== 'ALL')
      qb.andWhere('u.id=:id', { id: p.userId });
    if (!p.isSuperAdmin)
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM sys_user_role ur JOIN sys_role r ON r.id=ur.role_id AND r.enabled=1 LEFT JOIN sys_role_permission rp ON rp.role_id=r.id WHERE ur.user_id=u.id AND (r.is_super_admin=1 OR rp.code LIKE 'system:%'))`,
      );
    if (q.search)
      qb.andWhere('(u.username LIKE :search OR u.realName LIKE :search)', {
        search: `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
      });
    const [users, total] = await qb
      .orderBy('u.id', 'DESC')
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();
    return {
      list: await Promise.all(
        users.map((u) => this.userView(this.db.manager, u)),
      ),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  async user(p: Principal, id: string) {
    return this.userView(
      this.db.manager,
      await this.target(this.db.manager, p, id, 'system:user:read'),
    );
  }
  async createUser(p: Principal, d: CreateUserDto, rid: string, key?: string) {
    const passwordHash = await hash(d.password, 12);
    return this.write(
      p,
      'system:user:create',
      rid,
      'new-user',
      async (em, current) => {
        if (
          !current.isSuperAdmin &&
          current.permissions['system:user:create'] !== 'ALL'
        )
          fail(403, 'AUTHZ_DENIED', '创建用户需要全部范围');
        await em.insert(User, {
          username: d.username,
          realName: d.realName,
          passwordHash,
          enabled: true,
          mustChangePassword: true,
          securityVersion: 1,
          version: 1,
        });
        return this.userView(
          em,
          await em.findOneByOrFail(User, { username: d.username }),
        );
      },
      { key, input: d },
    );
  }
  async editUser(p: Principal, id: string, d: UpdateUserDto, rid: string) {
    return this.write(p, 'system:user:update', rid, id, async (em, current) => {
      const u = await this.target(em, current, id, 'system:user:update');
      this.version(u.version, d.version);
      if (d.realName === undefined && d.enabled === undefined)
        fail(400, 'VALIDATION_FAILED', '没有待更新字段');
      await this.updateUser(
        em,
        u,
        {
          ...(d.realName !== undefined ? { realName: d.realName } : {}),
          ...(d.enabled !== undefined ? { enabled: d.enabled } : {}),
          ...(d.enabled !== undefined && d.enabled !== u.enabled
            ? { securityVersion: u.securityVersion + 1 }
            : {}),
        },
        current,
        'system:user:update',
      );
      if (d.enabled === false)
        await em.update(
          Session,
          { userId: id, revokedAt: IsNull() },
          { revokedAt: new Date(), revokedReason: 'user-disabled' },
        );
      return this.userView(em, await em.findOneByOrFail(User, { id }));
    });
  }
  async assignRoles(p: Principal, id: string, d: AssignRolesDto, rid: string) {
    return this.write(
      p,
      'system:user:assign-role',
      rid,
      id,
      async (em, current) => {
        this.super(current);
        const u = await this.target(em, current, id, 'system:user:assign-role');
        this.version(u.version, d.version);
        d.roleIds.forEach(validId);
        const roles = d.roleIds.length
          ? await em.findBy(Role, { id: In(d.roleIds), enabled: true })
          : [];
        if (roles.length !== d.roleIds.length)
          fail(400, 'VALIDATION_FAILED', '角色不存在或已停用');
        await em.delete(UserRole, { userId: id });
        if (d.roleIds.length)
          await em.insert(
            UserRole,
            d.roleIds.map((roleId) => ({ userId: id, roleId })),
          );
        await this.updateUser(em, u, {}, current, 'system:user:assign-role');
        return this.userView(em, await em.findOneByOrFail(User, { id }));
      },
    );
  }
  async resetPassword(
    p: Principal,
    id: string,
    d: ResetPasswordDto,
    rid: string,
  ) {
    const passwordHash = await hash(d.password, 12);
    return this.write(
      p,
      'system:user:reset-password',
      rid,
      id,
      async (em, current) => {
        const u = await this.target(
          em,
          current,
          id,
          'system:user:reset-password',
        );
        this.version(u.version, d.version);
        await this.updateUser(
          em,
          u,
          {
            passwordHash,
            mustChangePassword: true,
            securityVersion: u.securityVersion + 1,
          },
          current,
          'system:user:reset-password',
        );
        await em.update(
          Session,
          { userId: id, revokedAt: IsNull() },
          { revokedAt: new Date(), revokedReason: 'password-reset' },
        );
        return { success: true };
      },
    );
  }
  private async roleView(em: EntityManager, r: Role) {
    const grants = await em.findBy(RolePermission, { roleId: r.id });
    const menus = await em.findBy(RoleMenu, { roleId: r.id });
    return {
      ...r,
      permissions: grants.map((g) => ({ code: g.code, scope: g.scope })),
      menuIds: menus.map((m) => m.menuId),
    };
  }
  async roles(p: Principal, q: PageQuery) {
    this.super(p);
    const qb = this.db.getRepository(Role).createQueryBuilder('r');
    if (q.search)
      qb.where('(r.code LIKE :s OR r.name LIKE :s)', {
        s: `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
      });
    const [roles, total] = await qb
      .orderBy('r.id', 'DESC')
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();
    return {
      list: await Promise.all(
        roles.map((r) => this.roleView(this.db.manager, r)),
      ),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  async createRole(p: Principal, d: CreateRoleDto, rid: string, key?: string) {
    return this.write(
      p,
      'system:role:create',
      rid,
      'new-role',
      async (em, current) => {
        this.super(current);
        if (d.code === 'super-admin' || d.code.startsWith('legacy-'))
          fail(400, 'VALIDATION_FAILED', '系统保留编码不可使用');
        await em.insert(Role, {
          code: d.code,
          name: d.name,
          enabled: true,
          isSuperAdmin: false,
          version: 1,
        });
        return this.roleView(
          em,
          await em.findOneByOrFail(Role, { code: d.code }),
        );
      },
      { key, input: d },
    );
  }
  private async role(em: EntityManager, id: string, version: number) {
    const r = await em.findOneBy(Role, { id: validId(id) });
    if (!r) fail(404, 'RESOURCE_NOT_FOUND', '角色不存在');
    this.version(r.version, version);
    return r;
  }
  async editRole(p: Principal, id: string, d: UpdateRoleDto, rid: string) {
    return this.write(p, 'system:role:update', rid, id, async (em, current) => {
      this.super(current);
      const r = await this.role(em, id, d.version);
      if (d.name === undefined && d.enabled === undefined)
        fail(400, 'VALIDATION_FAILED', '没有待更新字段');
      const result = await em.update(
        Role,
        { id, version: d.version },
        {
          ...(d.name !== undefined ? { name: d.name } : {}),
          ...(d.enabled !== undefined ? { enabled: d.enabled } : {}),
          version: r.version + 1,
        },
      );
      if (result.affected !== 1) fail(409, 'VERSION_CONFLICT', '角色已变化');
      return this.roleView(em, await em.findOneByOrFail(Role, { id }));
    });
  }
  async grantRole(p: Principal, id: string, d: RoleGrantsDto, rid: string) {
    return this.write(p, 'system:role:grant', rid, id, async (em, current) => {
      this.super(current);
      const r = await this.role(em, id, d.version);
      if (r.isSuperAdmin)
        fail(409, 'PROTECTED_ROLE', '超级管理员的安全权限不可通过后台重定义');
      const codes = d.permissions.map((g) => g.code);
      const known = new Set(
        (await registeredPermissions(em)).map((p) => p.code),
      );
      if (
        new Set(codes).size !== codes.length ||
        codes.some((code) => !known.has(code))
      )
        fail(400, 'VALIDATION_FAILED', '权限重复、未注册或已停用');
      if (
        codes.some((code) =>
          /system:(role|menu|permission):|system:user:assign-role/.test(code),
        )
      )
        fail(403, 'AUTHZ_DENIED', '角色授权及系统安全权限仅由超级管理员持有');
      d.menuIds.forEach(validId);
      if (
        d.menuIds.length &&
        (await em.countBy(Menu, { id: In(d.menuIds) })) !== d.menuIds.length
      )
        fail(400, 'VALIDATION_FAILED', '菜单不存在');
      await em.delete(RolePermission, { roleId: id });
      await em.delete(RoleMenu, { roleId: id });
      if (d.permissions.length)
        await em.insert(
          RolePermission,
          d.permissions.map((g) => ({
            roleId: id,
            code: g.code,
            scope: g.scope,
          })),
        );
      if (d.menuIds.length)
        await em.insert(
          RoleMenu,
          d.menuIds.map((menuId) => ({ roleId: id, menuId })),
        );
      const result = await em.update(
        Role,
        { id, version: d.version },
        { version: r.version + 1 },
      );
      if (result.affected !== 1) fail(409, 'VERSION_CONFLICT', '角色已变化');
      return this.roleView(em, await em.findOneByOrFail(Role, { id }));
    });
  }
  async deleteRole(p: Principal, id: string, d: ExpectedVersion, rid: string) {
    return this.write(p, 'system:role:delete', rid, id, async (em, current) => {
      this.super(current);
      const r = await this.role(em, id, d.version);
      if (r.isSuperAdmin || (await em.existsBy(UserRole, { roleId: id })))
        fail(409, 'RESOURCE_REFERENCED', '系统角色或仍关联用户的角色不能删除');
      await em.delete(RolePermission, { roleId: id });
      await em.delete(RoleMenu, { roleId: id });
      const result = await em.delete(Role, { id, version: d.version });
      if (result.affected !== 1) fail(409, 'VERSION_CONFLICT', '角色已变化');
      return { success: true };
    });
  }
  async permissions(p: Principal) {
    this.super(p);
    return registeredPermissions(this.db.manager);
  }
  components(p: Principal) {
    this.super(p);
    return Object.entries(pageRegistry).map(([component, page]) => ({
      component,
      ...page,
    }));
  }
  async menus(p: Principal, q: PageQuery) {
    this.super(p);
    const qb = this.db.getRepository(Menu).createQueryBuilder('m');
    if (q.search)
      qb.where('(m.title LIKE :s OR m.code LIKE :s)', {
        s: `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
      });
    const [list, total] = await qb
      .orderBy('m.sort', 'ASC')
      .addOrderBy('m.id', 'ASC')
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();
    return { list, total, page: q.page, pageSize: q.pageSize };
  }
  private async validateMenu(
    em: EntityManager,
    d: CreateMenuDto | UpdateMenuDto,
    id?: string,
  ) {
    if (
      [
        'Root',
        'Authentication',
        'Login',
        'ChangePassword',
        'FallbackNotFound',
        'AccountSessions',
      ].includes(d.name)
    )
      fail(400, 'VALIDATION_FAILED', '该路由名为系统保留');
    if (!/^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(d.name))
      fail(400, 'VALIDATION_FAILED', '路由名格式无效');
    if (d.type === 'page') {
      const page = pageRegistry[d.component];
      if (!page || page.path !== d.path || page.permission !== d.permission)
        fail(
          400,
          'VALIDATION_FAILED',
          '页面组件、路径与进入权限必须匹配已发布页面',
        );
    } else if (d.component !== '')
      fail(400, 'VALIDATION_FAILED', '非页面菜单不得指定组件');
    if (d.type === 'link') {
      let url: URL;
      try {
        url = new URL(d.path);
      } catch {
        fail(400, 'VALIDATION_FAILED', '外链无效');
      }
      if (url.protocol !== 'https:' || url.username || url.password)
        fail(400, 'VALIDATION_FAILED', '外链仅允许无凭据的 HTTPS 地址');
    } else if (
      !/^\/[a-zA-Z0-9/_-]+$/.test(d.path) ||
      d.path.startsWith('//') ||
      /^\/(auth|health)(\/|$)/.test(d.path) ||
      d.path === '/account/sessions'
    )
      fail(400, 'VALIDATION_FAILED', '路径无效或属于保留入口');
    if (
      d.type !== 'directory' &&
      !(await registeredPermissions(em)).some((p) => p.code === d.permission)
    )
      fail(400, 'VALIDATION_FAILED', '进入权限未注册');
    if (d.type === 'directory' && d.permission !== '')
      fail(400, 'VALIDATION_FAILED', '目录不授予接口权限');
    const all = await em.find(Menu);
    const map = new Map(all.map((m) => [m.id, m]));
    if (d.parentId) {
      validId(d.parentId);
      const parent = map.get(d.parentId);
      if (!parent || parent.type !== 'directory')
        fail(400, 'VALIDATION_FAILED', '父菜单必须是有效目录');
    }
    // 验证移动后的整棵树，包含所有后代，避免移动父节点造成深度越界。
    if (id) map.set(id, { ...map.get(id)!, ...d, id });
    for (const menu of [
      ...map.values(),
      ...(!id ? [{ id: 'new', parentId: d.parentId }] : []),
    ]) {
      const seen = new Set([menu.id]);
      let parentId = menu.parentId;
      let depth = 1;
      while (parentId) {
        if (seen.has(parentId) || ++depth > 5)
          fail(400, 'VALIDATION_FAILED', '菜单不能循环且最多 5 层');
        seen.add(parentId);
        parentId = map.get(parentId)?.parentId ?? null;
      }
    }
    if (id && d.type !== 'directory' && all.some((m) => m.parentId === id))
      fail(409, 'RESOURCE_REFERENCED', '存在子菜单，不能改为非目录');
  }
  async createMenu(p: Principal, d: CreateMenuDto, rid: string, key?: string) {
    return this.write(
      p,
      'system:menu:create',
      rid,
      'new-menu',
      async (em, current) => {
        this.super(current);
        await this.validateMenu(em, d);
        await em.insert(Menu, { ...d, version: 1 });
        return em.findOneByOrFail(Menu, { code: d.code });
      },
      { key, input: d },
    );
  }
  async editMenu(p: Principal, id: string, d: UpdateMenuDto, rid: string) {
    return this.write(p, 'system:menu:update', rid, id, async (em, current) => {
      this.super(current);
      const m = await em.findOneBy(Menu, { id: validId(id) });
      if (!m) fail(404, 'RESOURCE_NOT_FOUND', '菜单不存在');
      this.version(m.version, d.version);
      await this.validateMenu(em, d, id);
      const result = await em.update(
        Menu,
        { id, version: d.version },
        {
          name: d.name,
          path: d.path,
          title: d.title,
          ...(d.icon !== undefined ? { icon: d.icon } : {}),
          component: d.component,
          permission: d.permission,
          parentId: d.parentId,
          type: d.type,
          sort: d.sort,
          visible: d.visible,
          enabled: d.enabled,
          version: m.version + 1,
        },
      );
      if (result.affected !== 1) fail(409, 'VERSION_CONFLICT', '菜单已变化');
      return em.findOneByOrFail(Menu, { id });
    });
  }
  async deleteMenu(p: Principal, id: string, d: ExpectedVersion, rid: string) {
    return this.write(p, 'system:menu:delete', rid, id, async (em, current) => {
      this.super(current);
      const m = await em.findOneBy(Menu, { id: validId(id) });
      if (!m) fail(404, 'RESOURCE_NOT_FOUND', '菜单不存在');
      this.version(m.version, d.version);
      if (
        (await em.existsBy(Menu, { parentId: id })) ||
        (await em.existsBy(RoleMenu, { menuId: id }))
      )
        fail(409, 'RESOURCE_REFERENCED', '存在子菜单或角色引用，不能删除');
      const result = await em.delete(Menu, { id, version: d.version });
      if (result.affected !== 1) fail(409, 'VERSION_CONFLICT', '菜单已变化');
      return { success: true };
    });
  }
  async sessions(p: Principal, userId = p.userId) {
    if (userId !== p.userId) {
      if (!p.permissions['system:user:sessions'])
        fail(403, 'AUTHZ_DENIED', '没有会话查看权限');
      await this.target(this.db.manager, p, userId, 'system:user:sessions');
    }
    const sessions = await this.db
      .getRepository(Session)
      .find({ where: { userId }, order: { expiresAt: 'DESC' }, take: 100 });
    return sessions.map((s) => ({
      id: s.id,
      current: s.id === p.sessionId,
      expiresAt: s.expiresAt.toISOString(),
      revokedAt: s.revokedAt?.toISOString() ?? null,
      revokedReason: s.revokedReason ?? null,
    }));
  }
  async revokeSession(
    p: Principal,
    sessionId: string,
    rid: string,
    userId = p.userId,
  ) {
    // 本人操作不需要用户管理权限；仍重查会话与所有者，禁止猜测他人 sessionId。
    return this.db.transaction(async (em) => {
      await em.findOneOrFail(SecurityState, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      const actor = await em.findOneBy(User, { id: p.userId, enabled: true });
      const own = await em.findOneBy(Session, {
        id: p.sessionId,
        userId: p.userId,
        revokedAt: IsNull(),
      });
      if (
        !actor ||
        !own ||
        actor.securityVersion !== p.securityVersion ||
        own.expiresAt.getTime() <= Date.now()
      )
        fail(401, 'AUTH_SESSION_REVOKED', '会话失效');
      if (actor.mustChangePassword)
        fail(403, 'AUTH_PASSWORD_CHANGE_REQUIRED', '请先改密');
      if (userId !== p.userId) {
        const current = { ...p, ...(await resolveAuthorization(em, p.userId)) };
        if (!current.permissions['system:user:revoke-session'])
          fail(403, 'AUTHZ_DENIED', '没有撤销会话权限');
        await this.target(em, current, userId, 'system:user:revoke-session');
      }
      const s = await em.findOne(Session, {
        where: { id: sessionId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!s) fail(404, 'RESOURCE_NOT_FOUND', '会话不存在或无权访问');
      if (!s.revokedAt) {
        s.revokedAt = new Date();
        s.revokedReason = 'manual-revoke';
        await em.save(s);
        await em.insert(Audit, {
          userId: p.userId,
          action: 'auth:session:revoke',
          resourceId: sessionId,
          requestId: rid,
          details: { targetUserId: userId },
          createdAt: new Date(),
        });
      }
      return { success: true };
    });
  }
}
