# DevPlatform 完整验证方案与验收矩阵

方案编号：VAL-20261111 · 版本：0.1（待审核）。创建：2026-11-11；更新：2026-11-12（Asia/Shanghai）。

对应 [总开发计划](../plans/2026-11-11-master-development-plan.md) 和 [TODO](../../TODO.md)。产品条款来自 [产品方案第十八章](../product/dev-platform.md#十八验收标准)；若条款变化，先评审差异，不覆盖原验收结果。

**本次只制定验证方案，不执行其中的业务测试。** 历史报告有时间／环境边界，不等于当前正式版通过；以下50项正式验收状态全部为待验。P0为AC01—34及AC39—50，共46项；P1生成器AC35—38共4项，不阻断v1.0.0。

## 1. 历史证据索引

| 编号 | 报告 | 可以支持的结论／限制 |
|---|---|---|
| E01 | [M0工程](2026-11-10-framework.md) | 当时15组集成、真实页面、容器与精度／会话局部；有缓存构建，不是无缓存／HTTPS／正式恢复通过 |
| E02 | [认证授权闭环](2026-11-11-auth-authorization.md) | 当时28组集成与3条E2E等；ALL／SELF和管理边界，不含部门／文件／任务 |
| E03 | [本地恢复](2026-11-11-local-recovery-and-restart.md) | 8组恢复、Origin、统一启动及原28组集成；不是客户升级和同组DB文件恢复 |
| E04 | [通用后台](2026-11-11-admin-shell.md) | 26项偏好单元、6项E2E及静态检查；消息为空状态，锁屏只在内存 |
| E05 | [登录与滑块](2026-11-11-login-slider.md) | 最新报告30组集成、7项E2E；首次改密后再次滑块与权限回归，非专业人机识别 |
| E06 | [依赖审计](dependency-audit.md) | 历史critical=0／high=72等，不能代表当前审计结果或生产无漏洞 |

证据按 [基线快照](../plans/2026-11-11-document-baseline.json) 的源码提交和SHA-256定位；本次未重跑，不将报告中的“未提交／本机当时进程”推断为今天的仓库或运行状态。

## 2. 测试层次、身份与样本

| 层次 | 主要验证 | 环境与证据 |
|---|---|---|
| DOC | 任务／AC覆盖、依赖、链接、快照、审批状态 | 只读文件及文档产物，禁止为此启动DB／整套业务测试 |
| FAST | 纯逻辑、DTO、生命周期、状态转换、变更文件格式／受影响类型 | 真实现有命令；不能用Mock证明SQL、锁、文件授权或队列可靠性 |
| DB | 操作范围、最终SQL、唯一／version、审计回滚、幂等、epoch、迁移 | 实际MySQL，专用账号／库／实例；竞争由屏障等可控手段触发，不以随机sleep证明并发 |
| FS／QUEUE | 引用与物理文件、投递／租约、恢复和清理 | 隔离真实文件目录、Valkey与Worker；故障位置、注入方法、恢复结果可追溯 |
| E2E | 真实API与页面、角色差异、失败反馈、刷新／重新登录 | Playwright隔离上下文；关键桌面／窄窗口／深浅主题按影响选择；不重复全套补图 |
| DEPLOY／NFR | 第二实例、HTTPS、重启、升级、恢复、负载 | 明确独立目标与授权，不能用开发热更新或卷持久化代替发布／恢复验收 |

身份样本：超级管理员（含最后两个管理员竞争）、有效但仅有明确权限的部门管理员、普通用户、未登录、禁用／首次改密／被撤权用户。部门样本：根、父子、兄弟、指定集合、无部门、跨部门对象；角色按具体操作组合，不能用查看范围替代修改／导出范围。

数据样本：BIGINT超过安全整数、DECIMAL边界、UTC跨日与纯日期、null／未传／空集合、软删仍占编码；非法／缺失／超限文件、任一可读普通引用与复合机密文件；导入重复、压缩炸弹与公式；任务重复投递、旧租约、撤权竞争；两个独立实例的相同业务ID。均使用虚构构造数据，不复制客户原始数据。

## 3. 环境保护与执行顺序

- 固定Node24.22.2／pnpm10.33.4，按仓库环境说明选用正确工具，不修改系统Node；锁文件安装只在新环境或依赖变化时做。
- 日常Web5777／API4310／MySQL13306与测试Web5778／API4311／MySQL13307分离。演练DB13308／13309仅在各脚本保护条件满足时按需使用，不把旧失败卷当新空库。
- 校验APP_ENV=test、INSTANCE_ID、数据库名／账号、回环目标和独立卷；不打印.env或完整展开Compose。不连接开发／生产库做破坏性夹具。
- 单个验证批次先静态／生成／构建，之后启动隔离服务并跑用例；构建与Vite E2E不并行，共用库的可变夹具不并行。独立无污染的只读检查才并行。
- 迁移前识别目标与恢复方案；空库和上一发布结构都要验。已执行Migration不改写；失败记录不能手补成功。
- 测试只清理本次随机数据／专用空间，完成后停止测试服务并保留卷；不重启日常环境、不删未知卷、不无范围prune。

## 4. 当前实际入口与后续建设入口

以下是已经存在的入口，不表示本轮执行；同一相关源码版本的构建产物可复用，但必须确认新鲜、来源相同。根命令带隐式编译时不再无故额外编译。

| 用途 | 实际命令／约束 |
|---|---|
| 环境状态 | `pnpm dev:status`；不为查文档启动服务 |
| 格式／类型 | `pnpm lint`、`pnpm typecheck`；小修复在工作包记录具体变更文件的oxfmt／oxlint命令，不照抄未展开占位符 |
| Server构建 | `pnpm build:server`，受影响源变化后才使相应旧产物失效 |
| API契约 | `pnpm api:generate`／`pnpm api:check`自带Server编译；若同批已经新鲜编译，可用已有底层入口 `pnpm exec tsx scripts/api.ts`／`pnpm exec tsx scripts/api.ts --check`，不能拿陈旧dist导出 |
| 边界 | `pnpm check:boundaries`；只代表其已实现静态规则，不证明完整调用图／所有范围安全 |
| 滑块纯服务／Origin | 新鲜Server产物后 `pnpm exec tsx tests/login-captcha.ts`、`pnpm exec tsx tests/origin-configuration.ts` |
| 偏好纯逻辑 | `pnpm exec vitest run packages/@core/preferences/__tests__/preferences.test.ts --environment happy-dom` |
| 真实MySQL集成 | `pnpm test:integration`自带编译；已新鲜编译时现有底层 `pnpm exec tsx tests/integration.ts` 保留原环境保护。当前尚无可靠分组参数，不假定传入filter就已定向 |
| 浏览器定向 | `pnpm test:e2e -- tests/e2e/authorization.spec.ts`；滑块可用 `pnpm test:e2e -- tests/e2e/shell.spec.ts -g '登录滑块'`；选用测试文件或用例前核对实际名称 |
| 完整现有浏览器 | `pnpm test:e2e`；现有7项约2分钟仅为历史同机参考，新环境／未来套件另测，不能承诺固定耗时 |
| Web构建 | `pnpm build:web`；全应用发布检查按实际启用范围选`pnpm build`，不在每次小文案变化后重做全流程 |
| 迁移／恢复脚本 | 已有`tests/authorization-migration.ts`只接受13308新空实例，`tests/authorization-recovery.ts`使用13309专用空间；必须先满足脚本／环境保护，新鲜编译后才运行对应`pnpm exec tsx`，不用于普通UI回归 |

仅需真实集成／E2E且已确认是当前本机专用实例时，可按 [环境说明](../development/local-environment.md) 使用：

```bash
docker compose -p dev-platform-authz-validation --env-file .env.test -f deployment/compose.test.yaml up -d --wait
# 在当前工作包批准范围内选择上述定向或集成命令；本行不是待执行脚本。
docker compose -p dev-platform-authz-validation --env-file .env.test -f deployment/compose.test.yaml stop
```

**尚待建设**：统一test:unit／集成分组、文件／解析／任务故障入口、性能、第二实例与客户升级／恢复脚本，以及CI迁移完整性／secret／权限覆盖等门禁。由DP-003、013—031等实现后再登记真实命令；不能预填这些检查通过或创建空成功脚本。

## 5. 按影响选择与停止规则

1. 文档／提示词：仅DOC；普通文案样式：目标页面与必要静态检查；行为变化：定向逻辑／API及关键页面；认证／范围／事务等增加相关真库否定和并发，不降级成纯Mock。
2. 首先复现最小失败，再定向修复；两次同类失败后禁止第三次原样全套，先查失败摘要、具体动作、夹具与环境，缩小复现。
3. 修复后只重测该缺陷和依赖它的场景。改测试同步／截图／文档，不自动使其他已通过代码证据失效；改登录缓存生命周期等共享状态则须重测相关登录、改密、会话和权限链路。
4. 通过“计划必要检查＋无未解风险”即交付，不为凑覆盖率或补截图重复整套。不能为了速度删除断言、改预期或跳过安全／迁移验证。
5. 记录检查耗时、构建耗时、重跑原因和实际代码版本；Token成本仅在工具有可靠统计时记录，不以字节数或猜测冒充。显著增加已批准验证成本／扩大范围，先提交差异计划。
6. CI和正式候选发布维持完整对应门槛，不因日常选择性验证自动降低。AC结果只对注明版本／环境有效；重开受影响条目并保留旧证据。

## 6. AC01—AC50 需求追溯

表中“预期”来自产品条款；详细步骤在对应DP实施包批准时补齐，不能仅靠编号关联代替用例。历史证据列是覆盖提示，**正式结果均为待验**；任务闭项与正式AC签署分别记录。

| AC／优先级 | 场景 | 必须验证的预期 | 工作包 | 验证层 | 历史证据／缺口 | 正式状态 |
|---|---|---|---|---|---|---|

| AC01／P0 | 空库初始化、并发初始化、再次启动 | 只创建一次管理员；无公共默认凭证；重启不重复建数据 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 独立实例／容器／恢复演练 | E01／E02：初始化局部；并发／重启完整组合待验 | 待验 |
| AC02／P0 | 关闭 Mock 登录真实后端 | 用户、菜单、权限来自数据库 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05：真实登录、菜单与权限 | 待验 |
| AC03／P0 | 错误密码及限流 | 反馈不枚举账号，达到配置阈值受限 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E01／E05：错误与滑块／限流局部 | 待验 |
| AC04／P0 | Access 到期，多请求及多标签续期 | 不无限刷新；凭证有效或安全重新登录；无重复业务写入 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E01／E02：轮换局部，真实多标签／丢响应待补 | 待验 |
| AC05／P0 | 禁用、重置、撤销会话 | 提交之后的新请求拒绝；原会话不能续期 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05：撤销／重置／禁用 | 待验 |
| AC06／P0 | 直接调用无权 API／篡改角色参数 | 后端拒绝，不以按钮隐藏作为授权 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-007](../plans/2026-11-11-master-development-plan.md#dp-007)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05：直接 API 拒绝 | 待验 |
| AC07／P0 | 多角色及指定部门范围 | 与确认的合并规则一致 | [DP-006](../plans/2026-11-11-master-development-plan.md#dp-006)、[DP-007](../plans/2026-11-11-master-development-plan.md#dp-007)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05仅ALL／SELF，无指定部门 | 待验 |
| AC08／P0 | 篡改详情 ID、修改、删除及批量混入无权记录 | 不泄露或修改越权数据；批量整批拒绝 | [DP-007](../plans/2026-11-11-master-development-plan.md#dp-007)、[DP-008](../plans/2026-11-11-master-development-plan.md#dp-008)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05单条范围，批量／部门待建 | 待验 |
| AC09／P0 | 授权变更与缓存 | 下一次请求按新权限判断 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-007](../plans/2026-11-11-master-development-plan.md#dp-007)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05角色变更即时生效 | 待验 |
| AC10／P0 | 并发移除最后管理员、越级授权 | 受保护变更被拒绝，系统仍可管理 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05最后管理员与越级保护 | 待验 |
| AC11／P0 | 部门／菜单循环、重复、关联删除 | 拒绝非法变更，无树结构损坏 | [DP-005](../plans/2026-11-11-master-development-plan.md#dp-005)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 单元＋真库＋页面 | E02菜单局部，无部门树 | 待验 |
| AC12／P0 | 未声明页面组件与危险外链 | 不加载任意代码，不执行脚本 URL | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 单元＋真库＋页面 | E02／E05组件／外链拒绝 | 待验 |
| AC13／P0 | 字典停用、被引用值编辑 | 历史可读，新选择受限，禁止破坏引用 | [DP-010](../plans/2026-11-11-master-development-plan.md#dp-010)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 单元＋真库＋页面 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC14／P0 | 参数修改与密钥检查 | 有效项生效，非法项拒绝，无秘密下发 | [DP-011](../plans/2026-11-11-master-development-plan.md#dp-011)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 单元＋真库＋页面 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC15／P0 | 业务事务或审计失败 | 业务不部分成功，失败可追踪 | [DP-012](../plans/2026-11-11-master-development-plan.md#dp-012)、[DP-015](../plans/2026-11-11-master-development-plan.md#dp-015)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 单元＋真库＋页面 | E01／E05审计失败回滚 | 待验 |
| AC16／P0 | 大整数、小数、日期、UTC 时刻往返 | 不丢精度，不错误跨日 | [DP-015](../plans/2026-11-11-master-development-plan.md#dp-015)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 单元＋真库＋页面 | E01／E05精度／UTC往返，完整业务字段待验 | 待验 |
| AC17／P0 | 两人同时修改 | 旧版本写入返回冲突，不静默覆盖 | [DP-008](../plans/2026-11-11-master-development-plan.md#dp-008)、[DP-015](../plans/2026-11-11-master-development-plan.md#dp-015)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 单元＋真库＋页面 | E02／E05版本冲突 | 待验 |
| AC18／P0 | 文件非法、超限、越权、孤儿、缺失及磁盘不足 | 正确拒绝／清理／提示，不暴露路径 | [DP-013](../plans/2026-11-11-master-development-plan.md#dp-013)、[DP-014](../plans/2026-11-11-master-development-plan.md#dp-014)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 真实存储＋真库＋页面 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC19／P0 | 空表、错误模板、重复行、超限导入 | 不提交，错误定位及数量正确 | [DP-018](../plans/2026-11-11-master-development-plan.md#dp-018)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 隔离解析＋真库＋页面 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC20／P0 | 预检后并发冲突、重复确认、提交后断网 | 原子结果可查，幂等无重复数据 | [DP-019](../plans/2026-11-11-master-development-plan.md#dp-019)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 隔离解析＋真库＋页面 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC21／P0 | 入库后队列宕机 | 任务保持可恢复状态，恢复后可投递 | [DP-020](../plans/2026-11-11-master-development-plan.md#dp-020)、[DP-024](../plans/2026-11-11-master-development-plan.md#dp-024)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC22／P0 | 重复投递和 Worker 强制退出 | 无重复完成，旧执行不覆盖新结果 | [DP-021](../plans/2026-11-11-master-development-plan.md#dp-021)、[DP-024](../plans/2026-11-11-master-development-plan.md#dp-024)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC23／P0 | 文件已生成但完成提交失败 | 能恢复／清理，不误报下载成功 | [DP-022](../plans/2026-11-11-master-development-plan.md#dp-022)、[DP-024](../plans/2026-11-11-master-development-plan.md#dp-024)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC24／P0 | 排队撤权、下载前撤权 | 任务或下载按规则拒绝，无旧文件泄漏 | [DP-022](../plans/2026-11-11-master-development-plan.md#dp-022)、[DP-023](../plans/2026-11-11-master-development-plan.md#dp-023)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC25／P0 | 0 行、超限、失败重试、文件到期 | 各状态与提示正确，不截断伪成功 | [DP-022](../plans/2026-11-11-master-development-plan.md#dp-022)、[DP-023](../plans/2026-11-11-master-development-plan.md#dp-023)、[DP-024](../plans/2026-11-11-master-development-plan.md#dp-024)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC26／P0 | 敏感日志及 Excel 公式输入 | 不记录秘密，不执行可控公式 | [DP-012](../plans/2026-11-11-master-development-plan.md#dp-012)、[DP-018](../plans/2026-11-11-master-development-plan.md#dp-018)、[DP-022](../plans/2026-11-11-master-development-plan.md#dp-022)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | E02／E05日志白名单局部，无Excel链路 | 待验 |
| AC27／P0 | 第二实例部署并互相猜测 ID | 数据、配置、文件、密钥和前端缓存隔离 | [DP-026](../plans/2026-11-11-master-development-plan.md#dp-026)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 独立实例／容器／恢复演练 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC28／P0 | Nginx 页面刷新与 API 错误 | 页面可刷新，API 不回退成 HTML 成功 | [DP-028](../plans/2026-11-11-master-development-plan.md#dp-028)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 独立实例／容器／恢复演练 | E01本地Nginx局部，真实HTTPS未验 | 待验 |
| AC29／P0 | 重启容器／主机 | 数据持久，健康状态和恢复行为正确 | [DP-028](../plans/2026-11-11-master-development-plan.md#dp-028)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 独立实例／容器／恢复演练 | E01容器局部，非主机完整恢复 | 待验 |
| AC30／P0 | 干净环境重建 | 按锁定依赖、镜像和迁移可复现 | [DP-026](../plans/2026-11-11-master-development-plan.md#dp-026)、[DP-028](../plans/2026-11-11-master-development-plan.md#dp-028)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 独立实例／容器／恢复演练 | E01使用受控缓存，非全新网络重建 | 待验 |
| AC31／P0 | 数据库及文件恢复 | 记录数、引用、文件校验和抽样业务核对通过 | [DP-029](../plans/2026-11-11-master-development-plan.md#dp-029)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 独立实例／容器／恢复演练 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC32／P0 | 有定制模块的底座升级 | 定制有效，原数据保留，发布清单一致 | [DP-030](../plans/2026-11-11-master-development-plan.md#dp-030)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 独立实例／容器／恢复演练 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC33／P0 | 迁移部分失败及应用回退 | 按演练方案恢复，不盲目重跑或只退镜像 | [DP-029](../plans/2026-11-11-master-development-plan.md#dp-029)、[DP-030](../plans/2026-11-11-master-development-plan.md#dp-030)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 独立实例／容器／恢复演练 | E03授权迁移局部恢复，非完整客户回退 | 待验 |
| AC34／P0 | 指定画像性能及资源测试 | 达到验收目标或明确失败并调整范围／实现 | [DP-031](../plans/2026-11-11-master-development-plan.md#dp-031)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 指定画像负载与资源测量 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC35／P1 | 支持类型生成、编译及 CRUD | 前后端和权限可用，配置可追踪 | [DP-034](../plans/2026-11-11-master-development-plan.md#dp-034)、[DP-035](../plans/2026-11-11-master-development-plan.md#dp-035) | 隔离输出＋真实编译／CRUD／中断 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC36／P1 | 不支持表结构、非法配置及路径 | 生成前阻止，无越界文件写入 | [DP-034](../plans/2026-11-11-master-development-plan.md#dp-034)、[DP-035](../plans/2026-11-11-master-development-plan.md#dp-035) | 隔离输出＋真实编译／CRUD／中断 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC37／P1 | 人工修改／删除／模板升级后再生成 | 差异可见，冲突阻止，custom 完整保留 | [DP-036](../plans/2026-11-11-master-development-plan.md#dp-036) | 隔离输出＋真实编译／CRUD／中断 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC38／P1 | 生成中断、重复生成及下载 | 无半套覆盖，产物和历史可核对 | [DP-035](../plans/2026-11-11-master-development-plan.md#dp-035)、[DP-036](../plans/2026-11-11-master-development-plan.md#dp-036) | 隔离输出＋真实编译／CRUD／中断 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC39／P0 | 角色 A 全量查看，角色 B 本人修改 | 能查全量；只能修改本人，混合批量整批拒绝 | [DP-007](../plans/2026-11-11-master-development-plan.md#dp-007)、[DP-008](../plans/2026-11-11-master-development-plan.md#dp-008)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05单条ALL查看＋SELF修改，批量待建 | 待验 |
| AC40／P0 | 新建同名菜单或修改组件标识 | 不能创造不存在的 API 权限；未知组件拒绝加载 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05导航与API分离 | 待验 |
| AC41／P0 | 并发将最后两个管理员降权／禁用 | 固定安全状态行串行检查，始终留下有效管理员 | [DP-004](../plans/2026-11-11-master-development-plan.md#dp-004)、[DP-009](../plans/2026-11-11-master-development-plan.md#dp-009) | 单元＋真库＋页面 | E02／E05并发保护 | 待验 |
| AC42／P0 | 两个相同 expectedVersion 更新同时到达 | 只成功一次，另一请求 409，无后写覆盖 | [DP-008](../plans/2026-11-11-master-development-plan.md#dp-008)、[DP-015](../plans/2026-11-11-master-development-plan.md#dp-015)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 单元＋真库＋页面 | E02／E05已有真库竞争证据 | 待验 |
| AC43／P0 | 同幂等键改请求内容，或成功后清理临时幂等记录 | 改内容 409；批次终态仍阻止再次导入 | [DP-019](../plans/2026-11-11-master-development-plan.md#dp-019)、[DP-020](../plans/2026-11-11-master-development-plan.md#dp-020)、[DP-024](../plans/2026-11-11-master-development-plan.md#dp-024)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | E05普通新增幂等局部，无导入终态清理重放 | 待验 |
| AC44／P0 | Worker 先执行，投递器后写 Queued | 状态不倒退，只有一个有效执行权 | [DP-021](../plans/2026-11-11-master-development-plan.md#dp-021)、[DP-024](../plans/2026-11-11-master-development-plan.md#dp-024)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC45／P0 | 旧 Worker 失去租约后恢复并提交结果 | lease_token 不匹配拒绝；不覆盖新文件或状态 | [DP-021](../plans/2026-11-11-master-development-plan.md#dp-021)、[DP-024](../plans/2026-11-11-master-development-plan.md#dp-024)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC46／P0 | 导出期间改角色、用户部门、部门树或记录归属 | epoch 变化使完成提交／下载失效，提示重新导出 | [DP-022](../plans/2026-11-11-master-development-plan.md#dp-022)、[DP-024](../plans/2026-11-11-master-development-plan.md#dp-024)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 真库＋Valkey＋Worker故障注入 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC47／P0 | 小 xlsx 压缩包含超大解压内容、公式或外链 | 隔离解析受限退出，API 保持可用，无非法提交 | [DP-018](../plans/2026-11-11-master-development-plan.md#dp-018)、[DP-024](../plans/2026-11-11-master-development-plan.md#dp-024)、[DP-025](../plans/2026-11-11-master-development-plan.md#dp-025) | 隔离解析＋真库＋页面 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC48／P0 | 同一附件关联一个可读对象和一个不可读对象 | 普通附件按任一有效可读引用授权；复合机密文件按模块严格策略 | [DP-013](../plans/2026-11-11-master-development-plan.md#dp-013)、[DP-014](../plans/2026-11-11-master-development-plan.md#dp-014)、[DP-015](../plans/2026-11-11-master-development-plan.md#dp-015)、[DP-016](../plans/2026-11-11-master-development-plan.md#dp-016) | 真实存储＋真库＋页面 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC49／P0 | 客户旧迁移与新底座迁移同名／改同表／种子冲突 | 升级前检测并中止或经兼容迁移处理，不自动覆盖客户配置 | [DP-030](../plans/2026-11-11-master-development-plan.md#dp-030)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 独立实例／容器／恢复演练 | 无对应完整链路证据；待建设／演练 | 待验 |
| AC50／P0 | 停写备份期间出现上传／导入／Worker 输出 | 写入受控，同组 DB＋文件可恢复并校验引用与哈希 | [DP-029](../plans/2026-11-11-master-development-plan.md#dp-029)、[DP-033](../plans/2026-11-11-master-development-plan.md#dp-033) | 独立实例／容器／恢复演练 | 无对应完整链路证据；待建设／演练 | 待验 |

## 7. 补充风险用例与阶段门槛

| 补充编号 | 场景与预期 | 关联工作包／AC |
|---|---|---|
| X01 | 缺失／伪造／跨浏览器／过期滑块凭证拒绝；密码失败消耗；离页后缓存Login不得保留已消费凭证；并发只一次进入认证 | DP-004；AC02—05 |
| X02 | 本人created_by、部门owner_dept_id分别判断；无部门／无归属、目标归属和选项查询不可退回全量 | DP-006—008；AC07—09、39 |
| X03 | fileIds未传不改、[]清关联、null拒绝；关联事务失败不删实体文件；清理与新引用竞争 | DP-013—015；AC18、48 |
| X04 | 解析进程超时／内存／压缩限制受控退出；确认失败事务回滚后可追踪，Committed不因幂等清理而重放 | DP-018—019；AC19—20、43、47 |
| X05 | security与task／业务锁序一致；授权变更与完成提交竞争无旧文件发布，失租旧执行不清理新产物 | DP-021—024；AC23—24、45—46 |
| X06 | 队列丢失后从MySQL重建新投递代次；BullMQ与DB不能形成乘法重试；重试上限后安全终态 | DP-021—025；AC21—22、44—45 |
| X07 | 冻结Secret／卷／网络／缓存实例空间，第二实例相同ID或错实例Token不能越界；HTTP不能验收生产Secure Cookie | DP-026、028；AC27—30 |
| X08 | 停写边界覆盖上传／导入／Worker发布，恢复组及密钥身份明确；旧应用不兼容新DDL时拒绝仅退镜像 | DP-029—030；AC31—33、49—50 |
| X09 | 任意HTTP写操作只POST，禁止PUT／DELETE／PATCH与方法覆盖；GET无业务写副作用；错误保持JSON和真实非2xx | DP-027；所有API工作包 |
| X10 | 生成器实际支持类型／配置／权限和归属须明确；输出路径穿越、人工删改和中断不能半套覆盖 | DP-034—036；AC35—38 |

阶段退出严格对应产品§17.2：M1=13项（01—10、39—41），M2=10项（11—18、42、48），M3=13项（19—26、43—47），M4阶段=10项（27—34、49—50）。v1.0.0最终再汇总全部46项P0；P1生成器另验4项。

Beta只按明确启用范围验收，但已启用功能安全／一致性／恢复不豁免；未开放功能不得展示假按钮或以Beta名义承诺。P1通知／统计有自己的模块用例，不篡改50项产品编号或混入46项P0计数。

## 8. 结果、缺陷与证据归档

实施阶段每次运行使用 `RUN-YYYYMMDD-DPxxx-NN`。使用现有验证模板保存：计划版本、DP／AC／X编号、候选commit、配置差异摘要（无秘密）、Node／pnpm／DB／队列／浏览器／CPU架构、输入与步骤、预期／实际、状态、命令退出码、耗时、证据路径、未覆盖项和检查者。

- 状态：未执行、通过、失败、阻塞、不适用。P0不适用必须给产品范围依据并由维护者确认，不能把缺实现写成不适用或通过。
- 缺陷编号BUG-YYYYMMDD-NNN关联DP、AC、发现运行、脱敏复现、严重度、修复提交和回归运行；同类失败保留首次证据，不删除失败测试。
- 通过某DP后更新TODO证据／状态，再更新该版本的AC结果记录；本规划矩阵保留“待验”的初始基线，不能把当前计划描述改写成历史已执行事实。
- 截图／日志／样本必须脱敏；不记录凭据、Token、Cookie、完整.env或客户原始数据。运行原始日志按约定受控保存，文档只链接必要证据，不复制长日志。
- 发布阻断：数据丢失、越权、无法初始化／恢复、未处置生产可达高危、关键P0失败／无证据。中低风险须写影响、规避与维护者接受依据；发布动作仍需明确授权。

## 9. 本次文档验证记录

本节在生成后静态核对完成时填写实际结果；不填写业务测试通过，不把E01—E06当成本轮运行。验证范围为任务编号／依赖闭合、50项AC无遗漏／无重复及P0/P1计数、链接／锚点、文档快照与原提交一致、git diff空白检查，以及待审核状态一致。


已执行（2026-11-12）：

| 文档检查 | 实际结果 |
|---|---|
| 一次性Python结构校验 | 39项任务与39个TODO一一对应，所有前置存在且无依赖环；全部50项AC唯一覆盖，46项P0／4项P1，工作包引用闭合，正式结果均待验 |
| 基线完整性 | 40份源文档的内容摘要与快照指定Git提交一致；不读取秘密配置 |
| Markdown本地链接／锚点 | 5份当前入口／规划文档共244个本地链接与锚点有效 |
| `git diff --check` | 通过，无差异空白错误 |
| 业务构建／DB／E2E／生产操作 | 本次未执行：仅文档规划，不应消耗业务验证资源或改变运行环境 |

结构检查不替代用户对范围、参数、优先级和成本的审核，也不证明未来实现已通过验收。当前工作仅完成规划文档，后续代码开发仍待确认。
