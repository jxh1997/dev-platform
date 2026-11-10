# DevPlatform

DevPlatform（BaJie Dev｜八戒开发）是面向软件产品开发与客户定制交付的开发底座，统一管理后台、服务端、数据与交付规范。

仓库：[jxh1997/dev-platform](https://github.com/jxh1997/dev-platform)。产品与验收基线：[DevPlatform 产品需求与技术实施方案 V1.0](docs/product/dev-platform.md)。

## 当前工程

当前为 **0.1.0-alpha.1 / M0 工程基线**：可启动的管理后台、NestJS API、MySQL 显式迁移、管理员初始化、会话认证、动态菜单及受保护的设备台账读写；附 Docker Compose / Nginx 与 CI 配置。实际验证范围见 [工程验证报告](docs/verification/2026-11-10-framework.md)。

本阶段未开放完整用户／角色／部门管理、文件、导入导出、任务与生成器。台账只启用全部／本人操作范围，不展示未实现功能。软件 v1.0.0 的全部 P0 能力尚未完成。依赖审计仍有待处理的高风险条目，当前用于隔离开发验证，详见 [依赖审计记录](docs/verification/dependency-audit.md)。

## 环境

- Node **24.22.2**（见 `.node-version`），pnpm **10.33.4**。
- MySQL **8.4 LTS**；开发 Compose 使用固定镜像 `mysql:8.4.7`。
- 本地默认端口：管理后台 `5777`，API `4310`，开发 MySQL `13306`；隔离测试 API `4311`、MySQL `13307`。
- 前端来源固定 v5.7.0，后续不升级；来源、最小安全补丁和依赖见 [ADR-001](docs/architecture/ADR-001-framework-baseline.md)、[依赖基线](docs/architecture/dependency-baseline.md)、[第三方声明](THIRD_PARTY_NOTICES.md)。

## 本地启动

以下为新环境初始化步骤；本机当前已启动实例及工具路径见验证报告。先安装上述 Node / pnpm 与 Docker Compose，工作目录为仓库根目录。

```bash
corepack enable
corepack prepare pnpm@10.33.4 --activate
pnpm install --frozen-lockfile
pnpm env:init
# 生成随机本地密钥，拒绝覆盖已有 .env；前端配置不含秘密

docker compose --env-file .env -f deployment/compose.dev.yaml up -d --wait
pnpm db:migration:run
pnpm db:seed
```

如使用已有的本地 MySQL 8.4，需自行创建独立数据库和非 root 账号，将连接配置写入 `.env`，然后执行迁移。应用不会自动迁移，存在待执行迁移时拒绝启动；不使用 synchronize。

初始化管理员只运行一次。下面命令在 zsh / bash 中通过隐藏输入读取密码（6–12 字符）；不要把真实密码写入命令历史或提交文件。

```bash
export INIT_ADMIN_USERNAME=admin
read -r -s INIT_ADMIN_PASSWORD
export INIT_ADMIN_PASSWORD
pnpm admin:init
unset INIT_ADMIN_PASSWORD INIT_ADMIN_USERNAME
```

分别在两个终端启动：

```bash
pnpm dev:server   # TypeScript 监听编译，通过后启动／重启 API
pnpm dev:web
```

打开 **http://localhost:5777**。首次登录强制改密，保存后重新登录。API 健康检查为 `http://127.0.0.1:4310/api/v1/health/ready`。如需改变浏览器访问来源，同步 `.env` 的 `APP_ORIGIN`；Cookie 认证严格校验 Origin。前端代理可通过 `API_PROXY_TARGET` 指定，默认 `http://127.0.0.1:4310`。

## 检查与构建

```bash
pnpm lint
pnpm typecheck
pnpm check:boundaries
pnpm api:check
pnpm build
```

`pnpm api:generate` 从编译后的 DTO / Controller 导出 OpenAPI 和前端类型；不连接数据库，不手工编辑生成文件。`pnpm build` 只构建启用的 Web 与 Server，产物为 `apps/admin-web/dist/` 和根 `dist/`。生产 Node 启动命令为 `pnpm start:server`。

真实集成与浏览器测试使用独立实例和凭据，禁止指向开发或客户库：

```bash
pnpm env:init --test
docker compose --env-file .env.test -f deployment/compose.test.yaml up -d --wait
pnpm test:integration
pnpm exec playwright install chromium
pnpm test:e2e
# 若开发前端已占用 5777：E2E_WEB_PORT=5778 pnpm test:e2e
```

测试校验 APP_ENV、INSTANCE_ID、库名、账号和本机连接目标，仅清理本次随机创建的数据。集成测试包含权限、幂等、版本并发、审计失败回滚、精度及刷新复用；E2E 使用真实 API 验证登录、菜单、台账读写与重载恢复。测试 DB 首次迁移由集成测试执行，因此先运行集成测试再执行 E2E。

## 部署

详见 [部署操作说明](deployment/README.md)。生产部署先准备 HTTPS 入口和独立密钥，不运行 Vite 开发服务器。

```bash
APP_ORIGIN=https://platform.example.com pnpm env:init --deployment
docker compose --env-file deployment/.env -f deployment/compose.yaml config --quiet
docker compose --env-file deployment/.env -f deployment/compose.yaml up -d --build --wait
```

此命令部署 MySQL、一次性 migrate、Server 和 Web；Web 仅绑定宿主 `127.0.0.1:8080`，由宿主 HTTPS 反向代理接入。管理员仍需通过一次性命令初始化。不要将本地开发凭据用于生产。

## 目录与协作

| 路径 | 职责 |
|---|---|
| `apps/admin-web/` | 管理后台页面、路由、请求与品牌适配 |
| `apps/server/` | HTTP 启动、装配、响应、验证和异常处理 |
| `packages/backend-modules/` | 认证、会话和台账用例 |
| `packages/database/` | 实体、DataSource、显式迁移和初始化命令 |
| `packages/contracts/` | OpenAPI 生成的前端契约类型 |
| `packages/@core/`、`packages/effects/`、`internal/` | 保留的前端基础依赖与工具 |
| `deployment/`、`scripts/`、`tests/` | 部署配置、工程脚本与真实验证 |
| `docs/` | 产品基线、规范、模块设计与验证报告 |

AI 开发先读 [AGENTS.md](AGENTS.md)、[AI.md](AI.md)，再按 [文档导航](docs/README.md) 加载相关规范。业务 API **仅 GET 和 POST**；更新及删除分别使用 POST 动作路径。没有授权时不发布或推送。
