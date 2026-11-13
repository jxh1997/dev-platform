# DevPlatform

DevPlatform（BaJie Dev｜八戒开发）是面向软件产品开发与客户定制交付的开发底座，统一管理后台、服务端、数据与交付规范。

仓库：[jxh1997/dev-platform](https://github.com/jxh1997/dev-platform)。产品与验收基线：[DevPlatform 产品需求与技术实施方案 V1.0](docs/product/dev-platform.md)。

开发推进见 [TODO](TODO.md)、[总开发计划](docs/plans/2026-11-11-master-development-plan.md) 和 [验证方案](docs/verification/2026-11-11-master-validation.md)。当前路线图待审核，历史局部通过不代表全部P0或正式版验收通过。

## 产品定位

平台面向需要独立部署的小型业务系统，为行业软件、客户定制开发、部署实施和后续维护提供可复用基础。首个软件版本聚焦 **PC 管理后台＋通用后端**，以设备台账验证真实业务链路；App、小程序与 PDA 属于未来扩展方向。

产品资产分为三层：

| 层级 | 职责 |
|---|---|
| 公共底座 DevPlatform | 工程、认证授权、基础管理、通用服务与交付规范 |
| 行业产品 | 独立的行业流程、业务规则、操作手册与产品验收 |
| 客户项目 | 客户品牌、业务参数、专属流程与外部集成 |

每个客户独立部署应用、数据库、文件和配置，首期不采用共享数据库多租户 SaaS。客户项目从固定版本派生并保留 Git 历史和来源，公共修复可追溯回补，客户专属代码与数据不回流公共底座。没有行业产品层时，可直接从底座派生客户项目。

首期不建设插件市场、会员收费、拖拽页面设计器、通用审批引擎、微服务治理、Kubernetes、在线数据库编辑器或在线自动升级中心。设备台账是能力验证样例，行业订单、库存、支付等规则由具体产品定义。

## 当前工程

当前软件版本为 **0.1.0-alpha.1**，已在 M0 工程基线上增加认证授权闭环：可启动的管理后台、NestJS API、MySQL 显式迁移、管理员初始化、会话认证、用户／角色／菜单管理、逐操作 ALL／SELF 授权、会话查看与撤销及受保护的设备台账读写；附 Docker Compose / Nginx 与 CI 配置。M0 验证范围见 [工程验证报告](docs/verification/2026-11-10-framework.md)，本次闭环见 [认证授权验证报告](docs/verification/2026-11-11-auth-authorization.md)。

管理后台已恢复登录布局与记住账号、偏好设置与刷新保持、浏览器全屏、标签页工具、搜索、时区、个人中心及临时锁屏。通知入口与消息中心提供空状态，站内消息后端后续建设；见 [通用交互验证报告](docs/verification/2026-11-11-admin-shell.md)。 登录页已按指定参考改为固定来源的插画分栏布局，增加服务端一次性滑块凭证；见 [登录布局与滑块验证](docs/verification/2026-11-11-login-slider.md)。

本阶段未开放部门管理与部门范围、文件、导入导出、任务与生成器。台账只启用全部／本人操作范围，不展示未实现功能。软件 v1.0.0 的全部 P0 能力尚未完成。依赖审计仍有待处理的高风险条目，当前用于隔离开发验证，详见 [依赖审计记录](docs/verification/dependency-audit.md)。

产品方案 **V1.0 是文档版本**，不代表软件已发布 v1.0.0，也不代表当前已满足完整 Alpha 或正式版验收要求。

## 目标能力与实施路线

以下为产品方案定义的目标，具体完成状态以上述当前工程、模块说明与验证报告为准。

| 里程碑 | 目标能力 | 验收重点 |
|---|---|---|
| M0 基线验证 | 固定来源、工程启动、真实接口、迁移、构建与容器 | 依赖兼容、真实登录与受保护读写 |
| M1 认证授权 | 用户、角色、菜单、部门、会话、逐操作数据范围 | 后端鉴权、撤权生效、最后管理员保护 |
| M2 基础管理 | 字典、公开参数、审计查询、受保护文件、验证模块 | 事务审计、并发版本、精度与文件授权 |
| M3 导入与任务 | Excel 预检与原子导入、异步导出、任务查询与恢复 | 幂等、可靠投递、租约与撤权后下载控制 |
| M4 独立交付 | 第二实例、发布清单、客户升级、备份恢复与操作文档 | 实例隔离、迁移冲突检测、恢复演练 |
| M5 快速开发 | P1 标准单表 CRUD 生成器，作为 v1.1 候选 | 生成与再生成、人工修改保护、冲突与中断处理 |

软件 **v1.0.0** 以全部 P0 能力和 46 项正式版验收场景通过为门槛，包括第二实例、升级和恢复验证；生成器属于独立 P1 工作包。试点 Beta 必须完成实际启用功能的安全、数据一致性与交付验收。完整定义见产品方案第十七、十八章，路线表不构成交付日期承诺。

## 技术架构

采用 **pnpm workspace＋模块化单体**，在应用入口装配业务模块，前后端通过 DTO／OpenAPI 契约协作。

| 层次 | 技术与约束 |
|---|---|
| 管理后台 | Vue 3、TypeScript、Element Plus，基于固定 Vben Admin v5.7.0 来源 |
| HTTP 服务 | NestJS＋Express；认证、输入校验、响应与异常处理统一装配 |
| 数据访问 | TypeORM＋mysql2＋MySQL 8.4 LTS；显式迁移，禁止自动同步正式结构 |
| 接口契约 | DTO／Controller 生成 OpenAPI 和前端类型，业务 API 仅 GET／POST |
| 独立部署 | Docker Compose＋Nginx，前端以静态产物交付 |
| 异步与文件（规划） | BullMQ＋Valkey＋独立 Worker；本地持久化文件与存储适配接口 |

当前运行链路为浏览器 → Web／Nginx → NestJS API → MySQL；本地开发通过 Vite 代理访问 API。Worker、队列和文件存储随对应阶段接入，不是当前启动前提。

## 环境

- Node **24.22.2**（见 `.node-version`），pnpm **10.33.4**。
- MySQL **8.4 LTS**；开发 Compose 使用固定镜像 `mysql:8.4.7`。
- 本地默认端口：管理后台 `5777`，API `4310`，开发 MySQL `13306`；隔离测试 Web `5778`、API `4311`、MySQL `13307`；升级／恢复演练数据库 `13308`／`13309` 按需启动。
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

**迁移和 `db:seed` 不会创建登录账号。首次使用必须初始化管理员；没有默认 admin 密码。**

初始化管理员只运行一次。下面命令在 zsh / bash 中通过隐藏输入读取密码（6–12 字符）；不要把真实密码写入命令历史或提交文件。

```bash
export INIT_ADMIN_USERNAME=admin
IFS= read -r -s INIT_ADMIN_PASSWORD
export INIT_ADMIN_PASSWORD
pnpm admin:init
unset INIT_ADMIN_PASSWORD INIT_ADMIN_USERNAME
```

日常开发使用统一入口，按 MySQL → API → Web 的顺序启动：

```bash
pnpm dev           # 后台启动，检查迁移与服务就绪
pnpm dev:status    # 查看进程、端口和数据库状态
pnpm dev:restart   # 整体重启，保留数据库卷
pnpm dev:stop      # 停止开发 Web／API／MySQL
```

日志位于 `tmp/dev-platform/server.log` 和 `tmp/dev-platform/web.log`。独立调试仍可使用 `pnpm dev:server`、`pnpm dev:web`；完整端口分配与使用方式见 [本地环境说明](docs/development/local-environment.md)。

打开 **http://127.0.0.1:5777**。首次登录强制改密，保存后重新登录。API 健康检查为 `http://127.0.0.1:4310/api/v1/health/ready`。如需改变浏览器访问来源，同步 `.env` 的 `APP_ORIGIN`；Cookie 认证严格校验 Origin。`localhost` 与 `127.0.0.1` 是不同来源，访问地址必须与 `APP_ORIGIN` 完全一致（协议、主机和端口），不要混用。修改 `.env` 后重启 API；`APP_ORIGIN` 不带尾部斜线或路径。前端代理可通过 `API_PROXY_TARGET` 指定，默认 `http://127.0.0.1:4310`。

## 检查与构建

```bash
pnpm lint
pnpm typecheck
pnpm check:boundaries
pnpm api:check
pnpm build
```

`pnpm db:seed` 同步代码注册的操作权限，不覆盖客户角色与菜单；角色授权、导航分配和管理员边界见 [认证授权模块说明](docs/modules/system/auth/README.md)。

`pnpm api:generate` 从编译后的 DTO / Controller 导出 OpenAPI 和前端类型；不连接数据库，不手工编辑生成文件。`pnpm build` 只构建启用的 Web 与 Server，产物为 `apps/admin-web/dist/` 和根 `dist/`。生产 Node 启动命令为 `pnpm start:server`。

真实集成与浏览器测试使用独立实例和凭据，禁止指向开发或客户库：

```bash
pnpm env:init --test
docker compose --env-file .env.test -f deployment/compose.test.yaml up -d --wait
pnpm test:integration
# 定向验证仍先构建；可重复 --group，组内串行、每组独立夹具
pnpm test:integration --group identity
pnpm test:integration --group transport --group records
# 仅在相关 Server 源码已构建且没有再修改时复用产物（不校验产物新鲜度）
pnpm test:integration:run --group records
# 测试入口自身的参数及环境保护回归，无需数据库
pnpm exec tsx --test tests/integration-cli.test.ts
pnpm exec playwright install chromium
pnpm test:e2e
# 按现有规格文件定向；默认仍执行全部浏览器用例
pnpm test:e2e tests/e2e/authorization.spec.ts
# E2E 默认使用 5778；其他测试端口通过 E2E_WEB_PORT 显式指定
```

测试校验 APP_ENV、INSTANCE_ID、库名、账号和本机连接目标，仅清理本次随机创建的数据。集成测试包含权限、幂等、版本并发、审计失败回滚、精度及刷新复用；E2E 使用真实 API 验证登录、菜单、台账读写与重载恢复。测试 DB 首次迁移由集成测试执行，因此先运行集成测试再执行 E2E。

集成测试分为 `transport`（传输与响应，3组）、`records`（台账范围与事务，7组）、`identity`（认证会话与系统授权，20组）。无参数默认全套；未知参数、未知分组与空值在连接数据库前失败。共用测试库的命令不能并行执行。CI 在本工作流构建后使用 `test:integration:run` 执行全套，仍保留完整 E2E。

## 部署

详见 [部署操作说明](deployment/README.md)。以下为现有部署配置的使用方式；正式生产发布前仍需完成依赖安全与恢复等剩余验收。生产部署先准备 HTTPS 入口和独立密钥，不运行 Vite 开发服务器。

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

开发时保持以下约束：API 默认保护，各操作分别校验权限和数据范围；BIGINT、DECIMAL 对外使用字符串；重要更新以范围＋version 条件防止覆盖；业务变更与成功审计使用同一事务；结构变更提供新 Migration，不改写已执行迁移。

## 文档入口

| 文档 | 用途 |
|---|---|
| [产品需求与技术实施方案](docs/product/dev-platform.md) | 产品范围、业务规则、里程碑与验收标准 |
| [开发文档导航](docs/README.md) | 工程、接口、前后端、安全、UI 与质量规范 |
| [新模块开发指南](docs/development/module-guide.md) | 从模块设计到真实端到端链路 |
| [模块设计模板](docs/templates/module-spec.md) | 字段、接口、权限、事务与验收定义 |
| [依赖基线](docs/architecture/dependency-baseline.md) | 固定来源、依赖版本与兼容性验证 |
| [部署操作说明](deployment/README.md) | 环境初始化、部署、健康检查与备份恢复边界 |
| [工程验证报告](docs/verification/2026-11-10-framework.md) | 已执行检查、实际结果与剩余限制 |
| [第三方声明](THIRD_PARTY_NOTICES.md) | 上游来源与许可说明 |
