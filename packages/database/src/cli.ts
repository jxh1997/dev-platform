import { hash } from 'bcryptjs';
import {
  createDataSource,
  User,
  UserPermission,
  BootstrapState,
  Audit,
} from './index';

async function main() {
  const command = process.argv[2];
  if (!['run', 'show', 'seed', 'admin'].includes(command ?? ''))
    throw new Error('支持 run / show / seed / admin');
  const db = await createDataSource().initialize();
  try {
    if (command === 'run') {
      await db.runMigrations({ transaction: 'each' });
      console.log('数据库迁移完成');
    }
    if (command === 'show')
      console.log(
        (await db.showMigrations()) ? '存在待执行迁移' : '迁移已全部执行',
      );
    if (command === 'seed') {
      const state = await db
        .getRepository(BootstrapState)
        .findOneByOrFail({ id: 1 });
      console.log(
        `基线种子已存在；管理员${state.completed ? '已' : '未'}初始化，不覆盖现有用户与授权`,
      );
    }
    if (command === 'admin') {
      const username = process.env.INIT_ADMIN_USERNAME;
      const password = process.env.INIT_ADMIN_PASSWORD;
      if (
        !username ||
        !/^[a-zA-Z0-9_.-]{3,64}$/.test(username) ||
        !password ||
        [...password].length < 6 ||
        [...password].length > 12 ||
        Buffer.byteLength(password, 'utf8') > 72
      ) {
        throw new Error(
          '通过环境提供 INIT_ADMIN_USERNAME（3—64 位）与 INIT_ADMIN_PASSWORD（6–12 字符），不得使用默认凭据',
        );
      }
      const passwordHash = await hash(password, 12);
      await db.transaction(async (em) => {
        const state = await em.findOneOrFail(BootstrapState, {
          where: { id: 1 },
          lock: { mode: 'pessimistic_write' },
        });
        if (state.completed) throw new Error('管理员已初始化，拒绝再次执行');
        await em.insert(User, {
          username,
          realName: '平台管理员',
          passwordHash,
          enabled: true,
          mustChangePassword: true,
          securityVersion: 1,
        });
        const user = await em.findOneByOrFail(User, { username });
        const codes = ['list', 'read', 'create', 'update', 'delete'];
        await em.insert(
          UserPermission,
          codes.map((action) => ({
            userId: user.id,
            code: `demo:record:${action}`,
            scope: 'ALL' as const,
          })),
        );
        await em.insert(Audit, {
          userId: user.id,
          action: 'system:admin:init',
          resourceId: user.id,
          requestId: 'bootstrap',
          details: {},
          createdAt: new Date(),
        });
        state.completed = true;
        await em.save(state);
      });
      console.log('管理员初始化完成；首次登录必须修改密码');
    }
  } finally {
    await db.destroy();
  }
}
main().catch(() => {
  console.error(
    '数据库命令失败，请检查配置、迁移状态或初始化条件；未输出敏感诊断。',
  );
  process.exitCode = 1;
});
