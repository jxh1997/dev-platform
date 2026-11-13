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

## DP-001 文档口径确认（2026-11-12）

保留固定Vben来源及既有bcryptjs cost12、新密码6–12字符，登录兼容历史密码；不修改凭据。测试基线为Vitest／tsx真实HTTP与MySQL／Playwright，不新增Jest或Supertest来匹配旧文案。实际表名和接口以迁移／DTO／Controller及生成OpenAPI为准，本次不改依赖或数据库。

本文件原有环境、锁摘要与“尚未接入”列表为2026-11-10记录；当前环境看local-environment，当前命令看实际package.json，定向验证工具见DP-003。历史记录不作为当前完整覆盖证明。依赖安全在DP-002重新审计；许可／可达性和CI缺口未因本次文档对齐被宣布通过。

2026-11-12：DP-002.1现状审计完成，依赖版本／锁文件未变；当前风险见 [审查记录](../verification/2026-11-12-dependency-review.md)。候选修复未获批准，不将审计完成记作依赖安全通过。

## 2026-11-12 首批定向修复结果

A-003批准的DP-002.2-A已完成：仅router2.2.0的path-to-regexp固定至8.4.2，Vben来源保持不变。目标两条公告已移除；审计仍有其他风险，前文历史快照保持原口径。当前锁文件SHA-256：`d7f60fe1453782556a805ff8feba651ea8fc75805b2afd942c167d9a7a3fa1e9`。变更、回归、30组集成及1项授权E2E证据见[修复报告](../verification/2026-11-12-router-dependency-fix.md)。未发布，DP-002尚未闭项。

## 2026-11-12 B批请求链修复结果

A-004批准B批四依赖修复已验证；28条目标公告消除，剩余125条，metadata high62／moderate47／low21／critical0。保持Vben来源及A批修复；当前锁SHA-256：`bab7b36092e812c1e8a6717f99b24d790975a9547617c50178da1489323f0e3e`。实际变更、测试与差分见[报告](../verification/2026-11-12-request-dependency-fix.md)，不替代前文历史快照。DP-002仍未闭项，未发布。

## 2026-11-12 C批依赖与构建链修复结果

A-005批准C批已完成验证，26模块120条目标公告消除；剩余5条公告，metadata high3／moderate6／low1／critical0。Vue／国际化／Tiptap家族同步，Vben来源不变；4处模型声明已兼容适配。当前锁SHA-256：`1d507d3505f8579f1a8a60d2b39327d258210685229bba85279489bb5ed4ae77`。实际变更、76项定向测试、5项安全回归、30组集成及完整7项E2E见[报告](../verification/2026-11-12-buildchain-dependency-fix.md)。peer警告及发行物验证边界保留，DP-002未闭项、未发布，前文保留历史口径。

## 2026-11-12 D批模式解析修复结果

A-006批准D批已验证；按父包约束升级glob14.0.5／minimatch11.0.8，3条目标公告消除，无新增；剩2条Zod／deepmerge公告，metadata high2／moderate0／low1／critical0。锁SHA-256：`4e55c5c7f68ee36271600d7084f54ee7ed037afffce2d0a23a7d5637a765c2a7`。6项限时回归、两端构建及30组集成见[报告](../verification/2026-11-12-pattern-dependency-fix.md)；Vben／Zod／deepmerge保持既有版本，E批和发行物仍待逐项确认，DP-002未闭项、未发布。

## 2026-11-12 E批补丁修复结果

A-007批准：Zod4分支4.6.7、Zod3及Zod4-v3兼容层／deepmerge共3份补丁已安装验证，原许可保留。原始audit仍有2条版本告警、退出1（metadata high1／moderate0／low1／critical0）；两条分别有补丁处置证据，不能将原始计数写成0。锁SHA-256：ce5af43a90ddc9827bc75ba69e05010c04945a5f2dc123a4793f4927028c23bd。36入口／6组安全、17表单、30集成及7项E2E等结果见[报告](../verification/2026-11-12-schema-merge-fix.md)；Vben与表单peer不变，发行物／镜像／完整许可分发待002.3，DP-002尚未闭项。

## 2026-11-12 发行物实测与OS门槛

A-008验证Server199依赖／Web实际bundle79许可、两端镜像及7组真实运行链路通过。原始OS扫描：Server219条包-CVE记录（critical1／high34），Web185条（critical3／high55）；不是独立漏洞数。Server严重项有Debian不受影响证据单列，其他OS门槛未通过，不以npm补丁结果替代。见[报告](../verification/2026-11-12-release-artifact-review.md)及逐条证据。基础系统差异未批准实施，DP-002未闭项／未发布。

## 2026-11-12 基础系统差异验证

A-009批准的新Server／Web镜像均无critical／high匹配，真实7组链路及系统专项通过；Server保留24 medium／12 low／2 unknown，Web原始匹配全部0。2条glibc unknown未获修复／不受影响证据，DP-002.3-b及父任务继续阻断。npm原始2条版本告警及A-007补丁处置口径不变。见[最新报告](../verification/2026-11-12-runtime-base-fix.md)，未发布。
