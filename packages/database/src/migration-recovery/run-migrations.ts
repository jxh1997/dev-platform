import { DataSource, MigrationExecutor } from 'typeorm';

/** 命名锁绑定同一连接，跨 CLI 进程串行；不依赖会被 DDL 隐式提交释放的事务锁。 */
export async function runDatabaseMigrations(db: DataSource) {
  const runner = db.createQueryRunner();
  let locked = false;
  try {
    const rows: { acquired: number | string | null }[] = await runner.query(
      "SELECT GET_LOCK(CONCAT('devplatform:',LEFT(SHA2(DATABASE(),256),48)),0) AS acquired",
    );
    if (String(rows[0]?.acquired) !== '1') throw new MigrationBusyError();
    locked = true;
    const executor = new MigrationExecutor(db, runner);
    executor.transaction = 'each';
    return await executor.executePendingMigrations();
  } finally {
    try {
      if (locked)
        await runner.query(
          "SELECT RELEASE_LOCK(CONCAT('devplatform:',LEFT(SHA2(DATABASE(),256),48)))",
        );
    } finally {
      await runner.release();
    }
  }
}
export class MigrationBusyError extends Error {
  constructor() {
    super('另一个迁移进程正在执行，请等待其完成后重试；本次没有执行迁移。');
    this.name = 'MigrationBusyError';
  }
}
