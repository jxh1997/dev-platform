# 依赖与命令基线

日期：2026-11-10。工程版本：0.1.0-alpha.1。来源与决策见 [ADR-001](ADR-001-framework-baseline.md)，实际结果见 [验证报告](../verification/2026-11-10-framework.md)。

## 固定来源与版本

| 项目 | 当前版本／来源 | 状态与限制 |
|---|---|---|
| 前端来源 | v5.7.0 / `63a38dce49ba109f61607994e21ba921d8e970e9` | 固定不升级，MIT；保留必要工作区与最小安全补丁 |
| Node | 24.22.2 | 本机使用隔离工具目录；容器相同版本 |
| pnpm | 10.33.4 | 依据上游 packageManager；单一锁文件 |
| Vue / Element Plus / Vite / TypeScript | 3.5.34 / 2.14.0 / 8.0.13 / 6.0.3 | 来源 catalog＋锁文件；实际构建验证 |
| NestJS common / core / platform-express | 11.2.9 | Express 5.3.0 |
| @nestjs/swagger | 11.4.8 | DTO → OpenAPI → 前端类型 |
| TypeORM / mysql2 | 0.3.31 / 3.23.1 | 禁止 synchronize；显式迁移；BIGINT／DECIMAL 字符串 |
| MySQL | 本机独立实例 8.4.13；Compose 8.4.7 | 8.4 LTS；容器验证状态单独记录 |
| JWT / bcryptjs | 9.0.3 / 3.0.2 | HS256，15m；bcrypt cost 12，最多 72 字节 |
| class-validator / class-transformer | 0.14.2 / 0.5.1 | DTO 明确校验，禁止未知字段 |
| openapi-typescript | 7.10.1 | 由 API schema 可复现生成 |
| Playwright | 1.60.0 | Chromium 148；真实页面与 API 验证 |
| Nginx | nginxinc/nginx-unprivileged:1.28.0-alpine | 8080 非 root；宿主 HTTPS 入口 |
| BullMQ / Valkey / Worker / Excel | 未启用 | 本次不安装、不装配、不宣称验证 |

来源 URL：[前端固定提交](https://github.com/vbenjs/vue-vben-admin/tree/63a38dce49ba109f61607994e21ba921d8e970e9)。许可证原文见根目录 LICENSE.vben；其他依赖遵循各自许可证。

锁文件 SHA-256：`5654818c0d0095b373bc4f4eb26c7c8524aadd88af3c53a4f1988ab1c2962490`。

本机平台：macOS arm64；运行时主技术路线未经替换。上游 Vite devtools 的间接依赖仍声明旧 Vite peer 范围，当前 devtools 关闭，锁文件安装、类型检查与实际构建结果记录在验证报告；不通过升级前端来源规避告警。NestJS / Scarf 安装脚本未启用，当前编译和运行不依赖其安装脚本。

## 已接入命令

| 命令 | 实际行为 |
|---|---|
| pnpm env:init [--test / --deployment] | 不覆盖已有文件，随机生成本地／测试／部署秘密；前端仅公开配置 |
| pnpm dev:web / dev:server | 管理后台 Vite；后端监听编译并在成功后重启 |
| pnpm build / build:web / build:server | 启用应用的生产构建 |
| pnpm start:server | 启动编译后的 HTTP 服务 |
| pnpm lint / typecheck | 自有代码格式与 correctness lint；前端及后端类型 |
| pnpm check:boundaries | 自有应用静态依赖方向与 GET／POST 方法白名单；不替代完整调用图审查 |
| pnpm api:generate / api:check | 无数据库导出契约／比较漂移，不手改产物 |
| pnpm db:migration:run / db:migration:show | 显式执行或查看已登记迁移，不随应用启动自动运行 |
| pnpm db:seed / admin:init | 检查种子基线／只初始化一次管理员，首次改密 |
| pnpm test:integration | 专用 MySQL 的真实集成与否定测试 |
| pnpm test:e2e | 真实浏览器登录、台账闭环和重载恢复 |

尚未接入：独立 test:unit（当前新增验证均为集成及 E2E）、自动 migration:generate、Worker 与任务专项、迁移历史校验和 CI、安全扫描 CI、正式发布和恢复演练。无对应实现前不提供空成功脚本。

## G0 判定

不能仅凭构建通过宣布 G0 全部完成。安装、类型、构建、真实 API、迁移、精度和会话均按验证报告逐项记录；容器、文件备份／恢复以及正式版能力单独判定。未来其他依赖变更需同步锁文件与证据，前端来源 v5.7.0 不升级。

## 依赖安全复核

首次审计后将服务端依赖固定至上述同主版本修复版本，并将 tar 7.5.15 → 7.5.21、tinypool 2.1.0 → 2.1.2 通过显式 override 固定。前端来源 v5.7.0 及其直接 catalog 基线未升级。修复后的工作区审计不再包含 critical 条目，但仍有 high / moderate 等未修复条目，详见 [依赖审计报告](../verification/dependency-audit.md)。当前不是生产安全验收通过状态。

## 容器证据

Linux arm64 镜像构建与健康启动已通过，Node／MySQL／Nginx 及最终应用镜像 ID 见验证报告。构建使用经冻结安装验证的受控 pnpm 内容缓存；无缓存网络下载路径尚未完成验证。MySQL 容器重启后迁移记录保留、API 恢复健康。
