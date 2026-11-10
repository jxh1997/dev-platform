# 工程目录与编码规范

版本：V1.0 · 规则前缀：ENG。

## 1. 技术与边界

ENG-01：采用 pnpm workspace、Vue3＋TypeScript、管理后台（基于 Vben v5.7.0）、NestJS＋Express、TypeORM＋mysql2、MySQL 8.4 LTS。任务阶段引入 BullMQ＋Valkey，生产以 Docker Compose＋Nginx 独立部署。具体补丁版本依据固定来源与集成验证锁定，不将在线文档的最新版直接写入依赖。

管理后台统一命名为 `admin-web`，入口为 `apps/admin-web/`；框架来源固定为 Vben Admin v5.7.0，后续不升级。导入时同步工作区包名（自有应用使用 `@dev-platform/admin-web`）、pnpm filter、脚本、Vite 配置、CI 和容器构建路径；不重命名必要的 `@vben/*` 上游包。

保留 Vben 所需的 packages、internal 与配置，业务适配以应用层为主。`@vben/*` 保持上游标识，自有私有包采用 `@dev-platform/*` 并配置 private。不得自动发布工作区包。

## 2. 根目录职责

下表为目标目录，不要求立即创建所有空目录。

| 路径 | 职责与允许内容 |
|---|---|
| `apps/admin-web/` | 管理后台入口、业务页面、请求适配、路由与偏好 |
| `apps/server/` | HTTP 启动、模块装配、全局管道与中间件配置 |
| `apps/worker/` | Worker 启动、处理器装配与生命周期，不复制业务逻辑 |
| `packages/backend-modules/` | auth、system、file、task、demo 等后端模块与公开 Provider |
| `packages/database/` | Entity、DataSource、显式实体清单、Migration、种子和数据库工具 |
| `packages/contracts/` | 生成的 API 类型与无运行依赖的公共枚举／基础类型 |
| `packages/shared/` | 已真实重复使用、与业务无关的纯工具；没有使用需求不建 |
| `packages/customer-business/` | 客户专属业务模块，仅存在于对应客户仓库 |
| `packages/generator/` | P1 开发环境生成器，不由客户生产后台执行 |
| `deployment/` | Compose、Nginx、环境模板与备份恢复脚本 |
| `scripts/` | 开发、检查、契约生成及发布辅助脚本 |
| `docs/product/` | 当前有效的产品与范围说明 |
| `docs/modules/<domain>/<resource>/` | 模块设计、特殊流程与引用 |
| `docs/standards/` | 当前工程规范 |
| `docs/architecture/` | 依赖基线、架构决策 |
| `docs/verification/` | 必要的版本验证与恢复报告，禁止含客户原始资料 |
| `AGENTS.md`、`AI.md` | 仓库协作入口与 AI 执行规则 |

## 3. 后端模块标准目录

示例模块键为 `demo.records`，代码目录为 `packages/backend-modules/src/demo/records/`。

| 相对路径 | 职责 | 创建条件 |
|---|---|---|
| `records.module.ts` | Nest 模块、Provider、明确 exports | 必需 |
| `records.controller.ts` | HTTP DTO、认证上下文、调用应用 Service | 有 HTTP 接口 |
| `records.service.ts` | 用例、校验、事务、审计编排 | 必需 |
| `records.query.ts` | 有范围的查询、排序白名单、分页和投影 | 数据查询存在 |
| `records.permissions.ts` | 稳定权限码与资源／操作声明 | 有受保护操作 |
| `dto/create-record.dto.ts` | 新增输入运行时校验与 OpenAPI | 有新增 |
| `dto/update-record.dto.ts` | 更新输入、version、可空与未传语义 | 有更新 |
| `dto/query-records.dto.ts` | 分页、过滤、显式类型转换 | 有列表 |
| `dto/record-response.dto.ts` | 输出字段白名单与 OpenAPI | 有输出 |
| `mappers/record.mapper.ts` | Entity→响应 DTO，简单时可为局部函数 | 映射复杂才独立文件 |
| `policies/record-scope.policy.ts` | 模块归属与固定业务隔离 | 归属规则需要独立表达 |
| `handlers/export-records.handler.ts` | 调用应用查询与文件输出 | 启用导出才建 |
| `tests/records.service.spec.ts` | 业务与错误行为 | 有需验证的规则 |
| `tests/records.integration.spec.ts` | 真库范围、事务与并发 | 涉及数据安全或 SQL |

简单 CRUD 不强制拆出 Repository、Domain、UseCase、Factory 多层空壳。Service 不直接处理 HTTP response，Query 不返回无范围的通用 `findAll()`。

## 4. Entity、迁移与装配位置

ENG-02：本规范选择 V1.0 允许的“Entity 集中管理”方式，避免业务 Entity 回引数据库包形成循环。

| 路径 | 内容 |
|---|---|
| `packages/database/src/entities/system/` | sys_* 核心实体 |
| `packages/database/src/entities/demo/` | 验证模块实体 |
| `packages/database/src/entities/<domain>/` | 行业产品实体，仅实际需要时增加 |
| `packages/database/src/entities/customer/` | 客户专属实体，仅客户仓库维护，不回流公共底座 |
| `packages/database/src/migrations/` | 当前仓库完整迁移历史，来源与模块写入名称／发布清单 |
| `packages/database/src/entity-registry.ts` | 显式 Entity 注册清单，无应用层依赖 |
| `packages/database/src/data-source.ts` | CLI／应用共用的数据库配置构造，不依赖 Nest 启动 |
| `apps/server/src/composition/` | HTTP、权限注册、模块装配 |
| `apps/worker/src/composition/` | 启用处理器与 Worker 装配 |

同一实体只定义一处。客户项目可在中央清单登记自己的实体，但不能让公共底座模块 import 客户 Service。Migration 只通过独立命令执行，Server／Worker 启动不得各自抢跑迁移。

## 5. 前端目录

以设备台账为例：

| 路径 | 内容 |
|---|---|
| `apps/admin-web/src/views/demo/records/index.vue` | 列表容器 |
| `apps/admin-web/src/views/demo/records/components/record-form.vue` | 本模块表单 |
| `apps/admin-web/src/views/demo/records/schema.ts` | 列、筛选、表单字段与展示规则 |
| `apps/admin-web/src/api/demo/records.ts` | API 调用与生成契约类型别名 |
| `apps/admin-web/src/router/routes/modules/demo.ts` | 本版框架需要的静态声明／菜单适配；后端菜单模式不另建权限来源 |
| `apps/admin-web/src/locales/langs/zh-CN/demo.json` | 按实际 Vben 结构放置的文案，不擅自改上游 i18n 结构 |

路径以固定 Vben 来源实际目录为准；差异记录到依赖基线，不为匹配本文重构框架。只有多模块重复且语义相同的组件，才提到应用公共组件目录。

## 6. 依赖规则

ENG-03：依赖方向为 apps→backend-modules／customer-business→database／contracts；前端只可使用允许的 contracts／纯 shared。database 不 import backend-modules、apps 或客户 Service；backend-modules 不 import customer-business。跨模块只 import 对方公开入口，不深路径导入私有 Service／表访问逻辑。

| 内容 | 允许依赖 | 禁止依赖 |
|---|---|---|
| contracts | 纯类型、基础枚举 | Nest、TypeORM、Node fs、密钥配置 |
| database | TypeORM、驱动、受控环境解析 | Controller、前端、业务 Service |
| backend-modules | database、contracts、其他模块公开 Provider | 客户模块、apps 启动配置 |
| customer-business | 公共 Provider、database 中本客户实体 | 直接改 sys_* 表绕过公开用例 |
| admin-web | 生成契约、Vben、前端工具 | 后端包和数据库实体 |

公共数据库包可导出实体，不等于授予跨模块任意写表权限。代码检查和人工审查都要验证表归属。

## 7. 命名与代码约定

| 对象 | 约定 | 示例 |
|---|---|---|
| 文件／目录 | kebab-case，现有 Vben 约定优先 | `create-record.dto.ts` |
| TS 类／类型 | PascalCase | `RecordsService`、`RecordResponse` |
| 函数／字段 | camelCase | `ownerDeptId`、`findVisibleRecord` |
| 数据库表／列 | snake_case | `demo_record.owner_dept_id` |
| 权限码 | domain:resource:action | `demo:record:update` |
| API 资源 | 小写复数、kebab-case | `/demo/records`、`/export-tasks` |
| 模块文档目录 | domain/resource | `docs/modules/demo/records/README.md` |
| 稳定业务错误码 | UPPER_SNAKE_CASE | `VERSION_CONFLICT` |

ENG-04：TS 开启 strict；不以 any 或 ts-ignore 掩盖问题。禁止循环依赖与不必要的 barrel 全量导出。导入按类型和运行依赖区分，文件内部一致。样式、单双引号、排序等由现有 lint／formatter 自动维护，不为个人偏好批量格式化无关文件。

公开复杂方法用 TSDoc 说明输入、返回、错误和不变量；简单命名清楚的方法无需机械注释。TODO 必须包含原因和关联任务，不能遗留鉴权绕过、默认管理员或空实现。

## 8. 目标命令契约

ENG-05：下表是应落地的统一脚本接口。创建脚本前检查现有命令，将等价命令纳入基线；未实现时标注“未接入”，不得伪造成功。CI 脚本应真正执行检查并传播非零退出码，禁止 `|| true` 掩盖失败。

| 根目录目标命令 | 行为 | 环境 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 按锁文件安装 | 开发／CI |
| `pnpm dev:web`、`pnpm dev:server`、`pnpm dev:worker` | 分别启动服务 | 开发 |
| `pnpm lint`、`pnpm typecheck` | 规范与类型检查 | 开发／CI |
| `pnpm build` | 构建当前项目启用的应用及所需包，不构建未使用示例 | CI |
| `pnpm test:unit` | 单元测试 | 隔离环境 |
| `pnpm test:integration` | 真实 MySQL 的集成测试，启动前检查测试库保护 | 测试 |
| `pnpm test:e2e` | 关键页面与真实 API 冒烟 | 测试 |
| `pnpm check:boundaries` | 目录／依赖方向与循环引用 | CI |
| `pnpm api:generate` | 从隔离启动的后端生成 OpenAPI 和类型 | 开发／CI |
| `pnpm api:check` | 临时生成并比较快照，漂移返回失败，不改工作区 | CI |
| `pnpm db:migration:generate -- <name>` | 比对开发库并生成待审核迁移 | 明确开发库 |
| `pnpm db:migration:run` | 单一进程执行当前环境迁移 | 显式指定环境 |
| `pnpm db:migration:show` | 只读查看状态 | 目标环境 |
| `pnpm db:seed` | 幂等初始化，不覆盖客户配置 | 明确环境 |

默认不提供无环境保护的 `db:reset`。集成测试需校验 `APP_ENV=test`、明确的专用库名／实例标识、专用凭据三者，名称后缀不能作为唯一保护。

## 9. 配置与依赖维护

服务端配置启动时按 schema 校验，缺必需项立即失败；不得用生产弱密码、固定签名密钥或隐式 localhost 替代缺失配置。前端 VITE_* 视为公开信息。`.env.example` 只含字段和无秘密示例，真实 .env 不入 Git。

依赖与锁文件由 pnpm 生成；升级记录来源、动机、兼容及验证。保留上游许可证及第三方资源来源；不因父项目开源就假定所有插件可商用。新增包和提取公共层以实际复用为依据。

## 10. 容器工作区清单

新增、删除工作区包时，同步两个 Dockerfile 的 package.json COPY 清单；依赖安装层按清单缓存，源码复制后执行批准的重建和 stub。不能遗漏清单后用非冻结安装掩盖缺包。Server 与 migrate 共用镜像，但只有 Server 定义 build，避免重复构建。
