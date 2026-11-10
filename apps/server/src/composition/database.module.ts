import {
  Global,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createDataSource } from '../../../../packages/database/src';

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(private readonly db: DataSource) {}
  async onApplicationShutdown() {
    if (this.db.isInitialized) await this.db.destroy();
  }
}
async function runtimeDatabase() {
  const db = await createDataSource().initialize();
  if (await db.showMigrations()) {
    await db.destroy();
    throw new Error('存在未执行迁移，请先运行迁移命令');
  }
  return db;
}

@Global()
@Module({
  providers: [
    DatabaseLifecycle,
    {
      provide: DataSource,
      useFactory: async () =>
        process.env.OPENAPI_EXPORT === 'true'
          ? { isInitialized: false }
          : runtimeDatabase(),
    },
  ],
  exports: [DataSource],
})
export class DatabaseModule {}
