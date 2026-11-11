import { spawn, execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  openSync,
  closeSync,
  unlinkSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { parse } from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = join(root, 'tmp/dev-platform');
const action = process.argv[2] ?? 'up';
const nodeVersion = readFileSync(join(root, '.node-version'), 'utf8').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const services = {
  server: {
    port: 4310,
    script: join(root, 'scripts/dev-server.mjs'),
    args: [],
  },
  web: {
    port: 5777,
    script: join(root, 'node_modules/vite/bin/vite.js'),
    args: ['--host', '127.0.0.1', '--port', '5777', '--strictPort'],
    cwd: join(root, 'apps/admin-web'),
  },
};
const compose = [
  'compose',
  '--env-file',
  join(root, '.env'),
  '-f',
  join(root, 'deployment/compose.dev.yaml'),
];
const run = (file, args, env = process.env) =>
  execFileSync(file, args, { cwd: root, stdio: 'inherit', env });
function configuration() {
  if (!existsSync(join(root, '.env')))
    throw new Error('缺少 .env，请先运行 pnpm env:init');
  const env = parse(readFileSync(join(root, '.env')));
  const expected = {
    APP_ENV: 'development',
    INSTANCE_ID: 'dev-platform-local',
    APP_ORIGIN: 'http://127.0.0.1:5777',
    HOST: '127.0.0.1',
    PORT: '4310',
    DB_HOST: '127.0.0.1',
    DB_PORT: '13306',
    DB_DATABASE: 'dev_platform',
  };
  const invalid = Object.keys(expected).filter(
    (key) => env[key] !== expected[key],
  );
  if (invalid.length)
    throw new Error(
      `开发启动配置不符合端口规划：${invalid.join(', ')}；见 deployment/README.md。该命令不连接生产环境。`,
    );
  return env;
}
function stamp(pid) {
  try {
    return execFileSync(
      'ps',
      ['-p', String(pid), '-o', 'lstart=', '-o', 'args='],
      { encoding: 'utf8' },
    ).trim();
  } catch {
    return '';
  }
}
function statePath(kind) {
  return join(runtime, `${kind}.json`);
}
function owned(kind) {
  const path = statePath(kind);
  if (!existsSync(path)) return null;
  let value;
  try {
    value = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error(`${kind} 进程记录无效，需检查 ${path}`);
  }
  if (
    !Number.isSafeInteger(value.pid) ||
    value.pid < 2 ||
    value.root !== root ||
    typeof value.stamp !== 'string'
  )
    throw new Error(`${kind} 进程记录不符合本项目范围，拒绝操作`);
  const current = stamp(value.pid);
  if (
    !current ||
    current !== value.stamp ||
    !current.includes(services[kind].script)
  ) {
    unlinkSync(path);
    return null;
  }
  return value;
}
async function portFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}
async function waitReady(url, kind, timeout = 60000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!owned(kind))
      throw new Error(
        `${kind} 进程退出，请查看 ${join(runtime, `${kind}.log`)}`,
      );
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      await r.body?.cancel();
      if (r.ok) return;
    } catch {
      /* 等待本机服务启动。 */
    }
    await sleep(300);
  }
  throw new Error(`${kind} 启动超时，请查看 ${join(runtime, `${kind}.log`)}`);
}
async function launch(kind, env) {
  if (owned(kind)) return false;
  const config = services[kind];
  if (!(await portFree(config.port)))
    throw new Error(
      `${config.port} 已被其他进程占用；拒绝自动改端口或终止未知进程`,
    );
  const log = openSync(join(runtime, `${kind}.log`), 'a', 0o600);
  const child = spawn(process.execPath, [config.script, ...config.args], {
    cwd: config.cwd ?? root,
    detached: true,
    env:
      kind === 'server'
        ? { ...process.env, ...env }
        : {
            ...process.env,
            API_PROXY_TARGET: 'http://127.0.0.1:4310',
            VITE_PORT: '5777',
          },
    stdio: ['ignore', log, log],
  });
  closeSync(log);
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
  child.unref();
  const started = stamp(child.pid);
  if (!started) throw new Error(`${kind} 启动后立即退出，请查看本地日志`);
  writeFileSync(
    statePath(kind),
    JSON.stringify({ pid: child.pid, stamp: started, root }),
    { mode: 0o600 },
  );
  return true;
}
async function stop(kind) {
  const record = owned(kind);
  if (!record) return;
  // detached 子进程使用独立进程组，连同该组内的编译器／Vite 子进程优雅退出。
  try {
    process.kill(-record.pid, 'SIGTERM');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
  const deadline = Date.now() + 15000;
  while (stamp(record.pid) === record.stamp && Date.now() < deadline)
    await sleep(200);
  if (stamp(record.pid) === record.stamp)
    throw new Error(`${kind} 尚未退出，保留记录以便核查；未强制终止`);
  if (existsSync(statePath(kind))) unlinkSync(statePath(kind));
}
async function status(env) {
  for (const kind of ['server', 'web']) {
    const managed = owned(kind);
    const occupied = !(await portFree(services[kind].port));
    console.log(
      `${kind.padEnd(8)} 127.0.0.1:${services[kind].port} ${managed ? '已管理' : occupied ? '外部进程占用' : '未运行'}`,
    );
  }
  run('docker', [...compose, 'ps'], env);
}
async function main() {
  if (!['up', 'down', 'restart', 'status'].includes(action))
    throw new Error('支持 up / down / restart / status');
  if (process.versions.node !== nodeVersion)
    throw new Error(
      `请使用 Node ${nodeVersion}，当前为 ${process.versions.node}`,
    );
  const env = configuration();
  const actualEnv = { ...process.env, ...env };
  mkdirSync(runtime, { recursive: true, mode: 0o700 });
  // 同一工作区只允许一个生命周期操作，防止两个 up 在端口就绪前重复启动。
  const lock = join(runtime, 'operation.lock');
  let fd;
  try {
    fd = openSync(lock, 'wx', 0o600);
    writeFileSync(fd, String(process.pid));
  } catch {
    throw new Error(
      `已有生命周期操作或残留锁：${lock}；先检查记录中的进程是否仍在运行`,
    );
  }
  try {
    if (action === 'status') {
      await status(actualEnv);
      return;
    }
    if (action === 'down' || action === 'restart') {
      await stop('web');
      await stop('server');
      run('docker', [...compose, 'stop', 'mysql'], actualEnv);
      if (action === 'down') {
        console.log('开发服务已停止；数据库卷保留。');
        return;
      }
    }
    // 先确认应用端口，避免端口冲突时启动额外数据库或改变其他服务。
    for (const kind of ['server', 'web'])
      if (!owned(kind) && !(await portFree(services[kind].port)))
        throw new Error(
          `${services[kind].port} 被非本命令启动的进程占用，请先停止对应 DevPlatform 服务`,
        );
    run('docker', [...compose, 'up', '-d', '--wait', 'mysql'], actualEnv);
    const started = [];
    try {
      // 已执行迁移不会重跑；发现不一致时由迁移恢复校验明确拒绝。
      run(
        process.execPath,
        [
          join(root, 'node_modules/tsx/dist/cli.mjs'),
          join(root, 'packages/database/src/cli.ts'),
          'show',
          '--require-clean',
        ],
        actualEnv,
      );
      if (await launch('server', env)) started.push('server');
      await waitReady('http://127.0.0.1:4310/api/v1/health/ready', 'server');
      if (await launch('web', env)) started.push('web');
      await waitReady('http://127.0.0.1:5777/', 'web');
    } catch (error) {
      for (const kind of started.reverse()) await stop(kind);
      throw error;
    }
    console.log('DevPlatform 已启动：http://127.0.0.1:5777');
    console.log(
      `API：127.0.0.1:4310；MySQL：127.0.0.1:13306；日志：${runtime}`,
    );
  } finally {
    closeSync(fd);
    unlinkSync(lock);
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
