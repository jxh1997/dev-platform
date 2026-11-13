# DevPlatform 开发文档

产品基线：[DevPlatform 产品需求与技术实施方案 V1.0](product/dev-platform.md)。

本文档目录维护当前有效规范，文件名不携带版本号，版本在正文记录。产品文档定义范围与验收，工程规范细化实现方式；工程规范不自行扩大产品范围。修改范围或约束时同步相关文档，发现冲突先说明具体条款并解决，禁止静默覆盖。

原“基础工程规范与 AI 开发规范”已按职责拆入本目录及根目录，不再维护重复合订本。尚未存在的目录、脚本与公共能力均为实施目标。

## 当前开发与验证入口

- [开发 TODO](../TODO.md)：39个工作包的状态、批准批次与证据入口。
- [完整开发计划](plans/2026-11-11-master-development-plan.md)：内部审查、差异待决、M1—M5步骤、依赖和完成条件。
- [完整验证方案](verification/2026-11-11-master-validation.md)：分层验证、现有命令、AC01—AC50映射、缺陷与发布门槛。
- [依赖现状审查（2026-11-12）](verification/2026-11-12-dependency-review.md)：当前审计、来源／许可盘点和待批准修复批次。
- [编制基线快照](plans/2026-11-11-document-baseline.json)：40份源文档的提交与SHA-256；绑定编制前提交，不要求后续导航修改仍与旧摘要相同。

上述计划创建于2026-11-11，2026-11-12完成整理；当前执行状态和批准范围统一以根目录TODO为准。既有单项计划和验证报告保留为历史依据，不作为第二份当前TODO；状态在根目录TODO维护，产品范围仍以产品方案为准。

## 阅读顺序

- 人工开发：根目录 README → 产品基线 → 相关工程规范 → 模块开发指南。
- AI 开发：根目录 AGENTS.md → AI.md → 产品相关章节 → 任务涉及规范、模块与实际代码。
- 新模块：先填写模块设计模板，再完成一条真实端到端链路；不一次性创建所有目标空目录。

## 文件导航

| 文件 | 用途 |
|---|---|
| [AGENTS.md](../AGENTS.md) | 面向支持仓库指令文件的工具，提供短入口和不可绕过的约束 |
| [AI.md](../AI.md) | 完整 AI 工作规则、范围控制、风险分类、验证与交接 |
| [项目开发技能](../.agents/skills/dev-platform-workflow/SKILL.md) | 按需读取、大小改动分流、先审计划后编码与定向验证 |
| [工程目录与编码](standards/engineering.md) | 目录、依赖、命名、公共能力和命令契约 |
| [接口与数据](standards/api-data.md) | API、DTO、错误、精度、时区、并发、DDL 与契约来源 |
| [后端开发](standards/backend.md) | NestJS 职责、权限、事务、数据访问和配置 |
| [UI／UX 与视觉质量](standards/ui-ux.md) | 后台信息组织、视觉语言、交互、Vue 实现和浏览器验收 |
| [UI 技能基线](architecture/ui-skill-baseline.md) | 技能来源、固定提交、审查范围与复现方式 |
| [后台通用交互恢复](architecture/ADR-003-admin-shell.md) | 固定来源补丁、登录／偏好／全屏／锁屏与消息边界 |
| [前端开发](standards/frontend.md) | Vben 页面、请求、表单、状态和缓存 |
| [安全、文件与任务](standards/security-jobs.md) | 身份、文件、导入导出、队列和授权失效 |
| [质量与交付](standards/quality-delivery.md) | 测试矩阵、CI、迁移演练、发布与恢复 |
| [规则检查索引](standards/rule-index.md) | 核心规则、实现位置与验证方式 |
| [本地环境与端口](development/local-environment.md) | 日常启动、停止、重启、日志、端口与按需测试服务 |
| [新模块开发指南](development/module-guide.md) | 设备台账完整实例及逐步开发方式 |
| [模块设计模板](templates/module-spec.md) | 需求、数据、API、权限、事务与验收单一入口 |
| [AI 任务模板](templates/ai-task.md) | 可复制的 AI 开发任务输入 |
| [验证交接模板](templates/verification-report.md) | 真实验证结果、风险与接续工作 |
| [技术决策模板](templates/adr.md) | 仅用于影响范围较大的工程决策 |
| [依赖基线模板](architecture/dependency-baseline.md) | 固定版本、来源、命令与实际验证状态 |

## 规则级别

“必须／禁止”为强制约束；“默认”为未另有模块约定时的实施规则；“可选”为按需求启用。没有业务依据，不得把可选能力扩成新模块必交范围。默认值的变更应在相关模块规范中写明，不通过聊天中的临时假设覆盖仓库现行规则。

用户当前明确要求决定任务范围；如与既有约束冲突，先说明具体影响并找到可验证的实现方案。权限、数据完整性和生产环境保护不得被悄悄取消；影响这些约束的需求应显式更新设计与验证。

## 文件维护原则

按领域组织：模块资料统一放 `docs/modules/<domain>/<resource>/README.md`。简单模块只维护一份完整说明，不为每个 CRUD 接口机械生成多份文档。复杂流程需要单独文件时，由模块说明链接到它。

规范正文维护当前有效规则，不追加聊天记录、评审过程或 AI 长篇推理。代码变更证据保存在 PR、CI 或任务验证报告；验证报告不替代规范。已发布迁移与发布记录必须保留。

产品运行所需的登录日志、业务审计和任务记录属于系统能力，与文档历史记录不同。

- [路由依赖定向修复（2026-11-12）](verification/2026-11-12-router-dependency-fix.md)：A-003批准范围、测试与差分审计；其余依赖风险仍待处置。

- [请求链依赖修复（2026-11-12）](verification/2026-11-12-request-dependency-fix.md)：B批批准、28条公告差分与验证结果；[剩余风险闭项计划](verification/2026-11-12-risk-closure-plan.md)。

- [依赖与构建链修复（2026-11-12）](verification/2026-11-12-buildchain-dependency-fix.md)：C批批准、120条公告差分与完整验证；剩余5条由D／E继续处置。

- [模式解析依赖修复（2026-11-12）](verification/2026-11-12-pattern-dependency-fix.md)：D批定向修复、取消与兼容回归；[E批具体修复方案](verification/2026-11-12-schema-merge-fix-plan.md)及实施结果见后续报告。

- [Zod／deepmerge补丁修复（2026-11-12）](verification/2026-11-12-schema-merge-fix.md)：E批安装、安全与完整链路证据；原始告警和补丁处置分开记录，[维护说明](../patches/README.md)。

- [发行物与许可验证（2026-11-12）](verification/2026-11-12-release-artifact-review.md)：实际镜像／许可／真实链路与OS阻断；[基础系统差异方案](verification/2026-11-12-runtime-base-remediation-plan.md)及A-009实施结果见后续报告。

- [运行基础系统实施、真实验证与glibc剩余阻断](verification/2026-11-12-runtime-base-fix.md)（A-009，2026-11-12）。

- [glibc状态复核与暂缓处置](verification/2026-11-13-glibc-status-review.md)：保留评级来源、未修复事实及发布阻断。
- [DP-003测试分组验证](verification/2026-11-13-dp003-test-groups.md)：三个独立分组、默认全套及入口保护的本地验证。
- [DP-004认证与会话验收方案](plans/2026-11-13-dp004-auth-acceptance.md)：待用户确认，尚未实施。
