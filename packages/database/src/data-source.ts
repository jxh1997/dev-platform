import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { z } from 'zod';
import { entities } from './entity-registry';
import { InitialFramework1794268800000 } from './migrations/1794268800000-initial-framework';

export function databaseConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = z
    .object({
      APP_ENV: z.enum(['development', 'test', 'production']),
      DB_HOST: z.string().min(1),
      DB_PORT: z.coerce.number().int().min(1).max(65535),
      DB_USERNAME: z.string().min(1),
      DB_PASSWORD: z.string().min(16),
      DB_DATABASE: z.string().regex(/^[a-zA-Z0-9_]+$/),
      INSTANCE_ID: z.string().regex(/^[a-zA-Z0-9_-]{3,64}$/),
    })
    .safeParse(env);
  if (!config.success)
    throw new Error(
      `数据库配置缺失或无效：${config.error.issues.map((i) => i.path.join('.')).join(', ')}`,
    );
  if (config.data.DB_USERNAME === 'root')
    throw new Error('应用禁止使用 root 数据库账号');
  return config.data;
}

export function createDataSource(
  env: NodeJS.ProcessEnv = process.env,
): DataSource {
  const c = databaseConfig(env);
  return new DataSource({
    type: 'mysql',
    host: c.DB_HOST,
    port: c.DB_PORT,
    username: c.DB_USERNAME,
    password: c.DB_PASSWORD,
    database: c.DB_DATABASE,
    charset: 'utf8mb4',
    timezone: 'Z',
    supportBigNumbers: true,
    bigNumberStrings: true,
    entities,
    migrations: [InitialFramework1794268800000],
    migrationsTableName: 'sys_migrations',
    synchronize: false,
    migrationsRun: false,
    logging: false,
    poolSize: 10,
    extra: { decimalNumbers: false, connectTimeout: 5000 },
  });
}
