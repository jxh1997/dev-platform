# 本地迁移恢复、来源配置与整体重启

日期：2026-11-11。环境：本机 macOS arm64、Colima、Node 24.22.2、pnpm 10.33.4、MySQL 8.4.7。仅本地开发与隔离测试，未发布、未推送。

## 问题与修复

### 授权迁移重复列

开发库已有 sys_user.version、撤销原因列、7 张授权表及部分种子，但 sys_migrations 只有 M0 记录。MySQL DDL 隐式提交使结构与部分旧种子保留，直接重跑原迁移遇到 Duplicate column name。MySQL 行为依据：[隐式提交说明](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)。

保留原迁移文件和成功迁移名称，在 `packages/database/src/migration-recovery/` 增加仅对待执行授权迁移生效的恢复适配：

- 已有字段和表须匹配类型、长度、默认值、可空、主键、唯一约束、外键、显式排序规则与存储引擎；冲突即拒绝，不仅凭“存在”跳过。
- 只补缺失的权限、导航和关系，不覆盖已有名称或授权范围；角色身份、页面映射或范围冲突拒绝。
- 最后一条 DDL 后显式建立实际种子事务，让种子与 TypeORM 成功记录一起提交；不手工插入迁移成功记录，不删除失败数据伪装通过。
- CLI 使用与目标数据库绑定、同连接持有的 GET_LOCK 跨进程串行，拒绝并发执行。冲突只输出安全的对象名与处理说明。

实际操作前已将开发库备份至 Git 忽略的 backups 目录，文件权限 600；未打印备份内容。已在确认的 `dev-platform-local` 开发实例执行 `pnpm db:migration:run`、`pnpm db:migration:show`、`pnpm db:seed`，迁移全部完成，注册权限同步成功。管理员初始化继续由使用者设置凭据，未创建默认账号密码。

### 登录来源不一致

浏览器使用 `http://127.0.0.1:5777`，原 APP_ORIGIN 为 `http://localhost:5777`，严格来源校验按设计拒绝。已统一本机 `.env`、公开模板、初始化默认值及文档为 `http://127.0.0.1:5777`。生产仍要求 HTTPS；APP_ORIGIN 只接受规范的协议、主机和端口，不接受尾斜线、路径、内嵌凭据或非 HTTP(S) 协议。

已通过真实 Vite 代理验证：正确来源下虚构不存在账号返回 401 / AUTH_INVALID_CREDENTIALS，表示来源校验已通过；localhost、外部来源与缺失 Origin 仍返回 403 / CSRF_ORIGIN_DENIED。没有使用或记录真实密码，不把虚构账号的 401 当作登录成功。

## 当前启动规划与结果

统一生命周期命令：`pnpm dev`、`pnpm dev:stop`、`pnpm dev:restart`、`pnpm dev:status`。日志和进程记录在 `tmp/dev-platform/`，包含 PID 与启动标识，停止前验证工作区与脚本；未知端口占用拒绝，Web 使用 strictPort。

| 项目 | 当前状态 |
|---|---|
| Web 127.0.0.1:5777 | 已重新启动，HTTP 200，页面为 DevPlatform |
| API 127.0.0.1:4310 | 已重新启动，直连及 Web 代理下就绪检查通过 |
| MySQL 127.0.0.1:13306 | dev-platform-local 容器已重启并健康，原命名卷保留 |
| 8080 演示 Web／API／DB | 已停止，卷保留 |
| 13307／13308／13309 测试及演练 DB | 已停止，卷保留，按需启动 |
| 5778／4311 测试 Web／API | 未常驻；E2E 默认 Web 端口改为 5778 |

原手工启动的本仓库 Web／API 已识别工作目录并停止，替换为统一入口管理的进程。`dev:restart` 实际完成 Web／API 停止、开发 MySQL 停止与启动、迁移状态检查、API 编译和就绪、Web 启动检查。未终止其他项目或系统服务，未删除容器卷。

## 验证

| 检查 | 结果 |
|---|---|
| `pnpm build:server` | 恢复执行器编译通过 |
| `pnpm exec tsx tests/authorization-recovery.ts` | 8 组真实 MySQL 恢复验证通过：新库、加列后中断、建表后中断、部分种子已提交、兼容角色种子中断、字段漂移拒绝、授权漂移拒绝、并发锁；保留隔离空间核查 |
| `pnpm test:integration` | 迁移恢复修复后，原 28 组认证／授权真库测试通过 |
| `pnpm exec tsx tests/origin-configuration.ts` | 规范 Origin、无效配置及生产 HTTPS 限制通过，无数据库连接 |
| `node --check scripts/dev-environment.mjs` | 通过 |
| `pnpm lint`、`pnpm typecheck`、`pnpm check:boundaries` | 通过，生命周期脚本已加入检查范围 |
| `pnpm exec playwright test --list` | 测试配置加载与用例发现通过；本轮没有启动浏览器和测试 DB |
| `pnpm dev`、`pnpm dev:restart`、`pnpm dev:status` | 实际执行成功，当前只保留开发三项服务 |
| Web／代理／API／Origin 探测 | 页面及就绪 200；正确来源 401 凭据错误，其他／缺失来源 403 |
| `git diff --check` | 通过 |

本轮没有 UI 布局变更，未重复浏览器全量回归；此前 3 条真实浏览器链路见 [认证授权验证](2026-11-11-auth-authorization.md)。没有执行生产发布、生产恢复或备份还原演练，不能把本地重启视为这些验收通过。

后续从 [本地环境与端口](../development/local-environment.md) 使用统一入口。仅当明确需要测试时启动相应隔离容器，完成后停止；原有失败演练卷不当作新的空实例使用。
