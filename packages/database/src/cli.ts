import { hash } from 'bcryptjs';
import { MigrationRecoveryError } from './migration-recovery/authorization-schema';
import {
  MigrationBusyError,
  runDatabaseMigrations,
} from './migration-recovery/run-migrations';
import {
  createDataSource,
  User,
  UserRole,
  SecurityState,
  Role,
  RolePermission,
  RegisteredPermission,
  permissionRegistry,
  BootstrapState,
  Audit,
} from './index';

class InitializationError extends Error {}

async function main() {
  const command = process.argv[2];
  if (!['run', 'show', 'seed', 'admin'].includes(command ?? ''))
    throw new Error('支持 run / show / seed / admin');
  const db = await createDataSource().initialize();
  try {
    if (command === 'run') {
      await runDatabaseMigrations(db);
      console.log('数据库迁移完成');
    }
    if (command === 'show') {
      const pending = await db.showMigrations();
      console.log(pending ? '存在待执行迁移' : '迁移已全部执行');
      if (!pending) {
        const state = await db
          .getRepository(BootstrapState)
          .findOneBy({ id: 1 });
        if (state && !state.completed)
          console.warn(
            '管理员尚未初始化：迁移和 seed 不创建登录账号。请按 README 隐藏输入凭据后执行 pnpm admin:init。',
          );
      }
      if (pending && process.argv.includes('--require-clean'))
        process.exitCode = 1;
    }
    if (command === 'seed') {
      await db.transaction(async (em) => {
        await em.findOneOrFail(SecurityState, {
          where: { id: 1 },
          lock: { mode: 'pessimistic_write' },
        });
        for (const p of permissionRegistry) {
          await em.upsert(RegisteredPermission, { ...p, enabled: true }, [
            'code',
          ]);
          const role = await em.findOneByOrFail(Role, { code: 'super-admin' });
          if (
            !(await em.existsBy(RolePermission, {
              roleId: role.id,
              code: p.code,
            }))
          )
            await em.insert(RolePermission, {
              roleId: role.id,
              code: p.code,
              scope: 'ALL',
            });
        }
        await em.increment(SecurityState, { id: 1 }, 'authzEpoch', 1);
        await em.insert(Audit, {
          userId: '0',
          action: 'system:permission:sync',
          resourceId: 'registry',
          requestId: 'cli-seed',
          details: { codes: permissionRegistry.map((p) => p.code) },
          createdAt: new Date(),
        });
      });
      const state = await db
        .getRepository(BootstrapState)
        .findOneByOrFail({ id: 1 });
      console.log(
        `权限注册已同步；管理员${state.completed ? '已' : '未'}初始化，不覆盖现有用户与授权`,
      );
    }
    if (command === 'admin') {
      const username = process.env.INIT_ADMIN_USERNAME?.trim().toLowerCase();
      const password = process.env.INIT_ADMIN_PASSWORD;
      if (!username || !/^[a-zA-Z0-9_.-]{3,64}$/.test(username))
        throw new InitializationError(
          '请通过 INIT_ADMIN_USERNAME 提供 3–64 位字母、数字、点、横线或下划线组成的初始化账号。',
        );
      if (!password)
        throw new InitializationError(
          '缺少 INIT_ADMIN_PASSWORD；请按 README 使用终端隐藏输入，不要把密码写进命令历史。',
        );
      if (
        [...password].length < 6 ||
        [...password].length > 12 ||
        Buffer.byteLength(password, 'utf8') > 72
      )
        throw new InitializationError(
          '初始化密码必须为 6–12 字符；不会自动截断或去除空格。',
        );
      const passwordHash = await hash(password, 12);
      await db.transaction(async (em) => {
        await em.findOneOrFail(SecurityState, {
          where: { id: 1 },
          lock: { mode: 'pessimistic_write' },
        });
        const state = await em.findOneOrFail(BootstrapState, {
          where: { id: 1 },
          lock: { mode: 'pessimistic_write' },
        });
        if (state.completed)
          throw new InitializationError(
            '管理员已初始化，拒绝再次执行；本命令不会修改或重置已有密码。',
          );
        await em.insert(User, {
          username,
          realName: '平台管理员',
          passwordHash,
          enabled: true,
          mustChangePassword: true,
          securityVersion: 1,
        });
        const user = await em.findOneByOrFail(User, { username });
        const role = await em.findOneByOrFail(Role, {
          code: 'super-admin',
          enabled: true,
        });
        await em.insert(UserRole, { userId: user.id, roleId: role.id });
        await em.insert(Audit, {
          userId: user.id,
          action: 'system:admin:init',
          resourceId: user.id,
          requestId: 'bootstrap',
          details: {},
          createdAt: new Date(),
        });
        await em.increment(SecurityState, { id: 1 }, 'authzEpoch', 1);
        state.completed = true;
        await em.save(state);
      });
      console.log('管理员初始化完成；首次登录必须修改密码');
    }
  } finally {
    await db.destroy();
  }
}
main().catch((error: unknown) => {
  if (
    error instanceof InitializationError ||
    error instanceof MigrationRecoveryError ||
    error instanceof MigrationBusyError
  ) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.error(
    '数据库命令失败，请检查配置、迁移状态或初始化条件；未输出敏感诊断。',
  );
  process.exitCode = 1;
});
