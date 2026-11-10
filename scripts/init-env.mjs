import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
const secret = () => randomBytes(32).toString('hex');
const deployment = process.argv.includes('--deployment');
const test = process.argv.includes('--test');
const target = deployment ? 'deployment/.env' : test ? '.env.test' : '.env';
if (existsSync(target)) throw new Error(`${target} 已存在，拒绝覆盖`);
const origin = deployment ? process.env.APP_ORIGIN : test ? 'http://127.0.0.1:5777' : 'http://localhost:5777';
if (deployment && (!origin || !origin.startsWith('https://'))) throw new Error('部署模式需通过 APP_ORIGIN 提供 HTTPS 站点地址');
writeFileSync(target, `APP_ENV=${deployment ? 'production' : test ? 'test' : 'development'}
INSTANCE_ID=dev-platform-${deployment ? 'deployment' : test ? 'test' : 'local'}
APP_ORIGIN=${origin}
HOST=127.0.0.1
PORT=${test ? 4311 : 4310}
JWT_SECRET=${secret()}
DB_HOST=127.0.0.1
DB_PORT=${test ? 13307 : 13306}
DB_USERNAME=${test ? 'devplatform_test' : 'devplatform'}
DB_PASSWORD=${secret()}
DB_DATABASE=${test ? 'dev_platform_test' : 'dev_platform'}
MYSQL_ROOT_PASSWORD=${secret()}
WEB_PORT=8080
`, { mode: 0o600 });
if (!existsSync('apps/admin-web/.env')) copyFileSync('apps/admin-web/.env.example', 'apps/admin-web/.env');
console.log(`已生成 ${target}（未输出秘密）；管理员凭据通过初始化命令单独提供。`);
