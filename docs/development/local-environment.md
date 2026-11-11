# 本地开发环境与端口

日常开发采用宿主机 Web／API＋独立 MySQL 容器。Node 与 pnpm 使用根目录锁定版本；统一入口从根 `.env` 读取开发配置，拒绝生产环境和不同实例配置。

## 端口与启动项

| 用途 | 地址 | 启动策略 |
|---|---|---|
| 管理后台 Vite | http://127.0.0.1:5777 | `pnpm dev` 启动，严格固定端口 |
| NestJS API | http://127.0.0.1:4310/api/v1 | `pnpm dev` 启动，先编译后监听 |
| 开发 MySQL | 127.0.0.1:13306 | Compose 项目 dev-platform-local，保留原 mysql-data 卷 |
| 浏览器测试 Web／API | 127.0.0.1:5778／4311 | 仅运行 E2E 时启动；`pnpm test:e2e` |
| 集成测试 MySQL | 127.0.0.1:13307 | 仅测试时启动，独立 .env.test 与卷 |
| 从 M0 升级演练 MySQL | 127.0.0.1:13308 | 仅迁移演练时启动，要求新建空实例 |
| 失败恢复演练 MySQL | 127.0.0.1:13309 | 仅恢复测试时启动，独立 dev-platform-authz-recovery 项目 |
| 容器部署演示入口 | 127.0.0.1:8080 | 日常开发停用；需要容器验收时按 deployment/README.md 显式启动 |

以上均为回环地址。系统和其他项目的端口不由本项目启动命令管理。测试、演练及部署演示容器不随日常开发入口自动启动；停止容器不会删除卷。

## 日常命令

首次环境按根 README 完成安装、`env:init`、迁移、权限同步与管理员初始化。之后在仓库根目录运行：

```bash
pnpm dev
pnpm dev:status
pnpm dev:restart
pnpm dev:stop
```

- `dev`：检查固定开发配置与端口，等待 MySQL 健康，确认迁移全部执行，启动 API 并等待就绪，再启动 Web 并确认 HTTP 可用。命令返回后服务继续运行。
- `dev:status`：查看统一入口管理的应用进程和开发 MySQL 状态。
- `dev:restart`：优雅停止本入口启动的 Web／API，停止开发 MySQL，再按上述顺序启动，数据卷保留。
- `dev:stop`：停止本入口管理的 Web／API 和开发 MySQL，不操作测试及其他项目。

进程记录和日志位于被 Git 忽略的 `tmp/dev-platform/`：server.log、web.log 和对应 JSON 记录。记录包含 PID、启动标识与工作区，不保存密码；停止前核对进程启动标识及脚本路径，避免 PID 复用误杀。端口被外部进程占用时明确拒绝，不自动换端口或终止未知进程。

`pnpm dev:server`／`pnpm dev:web` 保留用于分别调试；使用前先停止统一环境，单独启动的进程需在其终端中停止。不要同时启动两组相同端口的应用。

## 来源与配置

浏览器统一访问 **http://127.0.0.1:5777**，根 `.env` 必须设置：

```dotenv
APP_ENV=development
INSTANCE_ID=dev-platform-local
APP_ORIGIN=http://127.0.0.1:5777
HOST=127.0.0.1
PORT=4310
DB_HOST=127.0.0.1
DB_PORT=13306
DB_DATABASE=dev_platform
```

密码和机器密钥仍由环境初始化随机生成，不能复制本文作为完整 `.env`。Web 的 `/api` 代理固定指向 4310；浏览器 Origin 原样保留，服务端严格比较 APP_ORIGIN。`localhost` 与 `127.0.0.1` 不同，APP_ORIGIN 不带路径或尾斜线。修改 `.env` 后执行 `pnpm dev:restart` 重新加载。

## 当前保留的测试卷

此前开发验证使用 `dev-platform-authz-validation` 项目的 13307 数据库；继续集成／E2E 时按该项目启动：

```bash
docker compose -p dev-platform-authz-validation --env-file .env.test -f deployment/compose.test.yaml up -d --wait
pnpm test:integration
pnpm test:e2e
docker compose -p dev-platform-authz-validation --env-file .env.test -f deployment/compose.test.yaml stop
```

全新环境可使用 compose.test.yaml 默认项目名。当前机器同一测试端口只启动一套项目，不把早期失败演练卷当作新的空实例。迁移和恢复测试的空库／专用空间保护见对应测试脚本。
