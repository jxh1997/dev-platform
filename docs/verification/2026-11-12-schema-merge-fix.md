# DP-002.2-E Zod与deepmerge安全修复

日期：2026-11-12；批准A-007：用户在D批交付并请求确认[E批具体方案](2026-11-12-schema-merge-fix-plan.md)后回复“继续”。仅E批及其验证，不含发行镜像变更或生产发布。工作区未提交，保留A—D及用户改动。

## 修复结论与审计语义

本次两条已知公告均完成**补丁修复并验证**，不称上游版本天然无漏洞或audit返回0。原始版本审计仍有两条记录、退出1：Zod3.25.76（high）、deepmerge4.3.1（low）；metadata critical0／high1／moderate0／low1。Zod4.4.3分支升级4.6.7后不再命中。

原始公告、实际路径、补丁及安装后摘要与逐ID处置见[结构化证据](2026-11-12-schema-merge-fix-data.json)。未添加audit忽略、伪造版本或改CI门禁；非零结果保留，不能宣称CI安全门禁通过。本次E审查已知两条的未处置数为0，不替代发行物／镜像检查。

## 实际变更

- 仅将knip6.14.1的Zod子依赖定向4.6.7；Zod3 catalog维持3.25.76，vee-validate／zod-defaults peer不改，无全局v4覆盖或表单迁移。
- pnpm patch／patch-commit生成3份补丁、patchedDependencies及锁。Zod3.25.76修复v3 Array／Set和附带旧v4 Array／Map／Set已有上限；Zod4.6.7补齐其v3兼容入口；deepmerge4.3.1覆盖源码、CJS和UMD。
- 已有max／exact length上限超限时保留大小错误，在子元素解析及Promise分配前终止；上限内、无上限、min、可选／默认／转换等保留原契约。不是所有无限集合的全局资源限制器。旧v4仅对上限失败payload跳过重复post-check，避免检查未解析值。
- deepmerge的目标复制／source合并用可枚举／可配置／可写的自有数据属性代替普通赋值，防止原型setter；保留继承属性保护、合法constructor／prototype和普通对象输出。
- 新增安全回归tests/schema-merge-dependency.cjs及共享表单schema-security.test.ts。生产业务／权限／数据库／页面源码未改。
- 安装后3补丁共12文件的SHA-256逐项等于pnpm编辑目录；3包原许可MIT及原文保留。维护与失效规则见[patches说明](../../patches/README.md)。

## 定向证据

原始缓存包已在隔离子进程复现：Zod3的max(1)收到2项仍执行2次子解析；deepmerge含own __proto__的target使返回对象继承攻击属性，本次合成夹具未污染全局原型。安装补丁后对应子解析为0，返回及全局原型保持预期。

新增安全测试6组包括：

- 两版Zod默认、v3、v4、mini／兼容别名、直接v4/core，覆盖CJS／ESM／TypeScript源码，共36个入口与加载条件组合。
- 同步／异步Array max／exact、Set max／exact及实际支持的v4 Map大小约束，计数证明超限时未执行子解析，错误code／maximum／path保留，上限内仍解析。
- 无上限集合、min、optional／nullable／default、refinement／transform及嵌套错误路径；一万项受控输入仅产生大小错误。子进程最多10秒、256MiB，不向业务API投递DoS。
- deepmerge target／source、null原型、嵌套／数组、继承、Symbol、属性描述符、constructor／prototype、自定义合并、Date／RegExp。发布源码的dev-only helper不随包安装，测试复用真实CJS中的同一上游helper执行源码，未新增依赖或改变生产行为。
- 真实databaseConfig／validateRuntime用合成配置验证正常、非法端口、root账号、异常Origin与生产HTTPS拒绝；子进程禁止dotenv读取日常配置，不输出真实配置。

早期编辑目录验证发现只包裹旧v4 runner会被classic／mini初始化覆盖，已改为parse入口和大小失败payload检查；最终以安装后全部入口验证。测试夹具中的Knip工作区定位、源码helper及字符串转义问题已修正，未删除断言或降低安全条件。

## 实际验证

| 检查 | 结果 |
|---|---|
| 定向升级锁生成／冻结安装 | 通过，不执行无关安装脚本 |
| 三次pnpm patch-commit | 成功生成／应用补丁及锁；使用ignore-scripts，不触发全工作区postinstall |
| 主项目最终离线冻结安装 | pnpm install --frozen-lockfile --offline --ignore-scripts通过，不代表完整镜像或无缓存安装 |
| 新安全回归 | node --test tests/schema-merge-dependency.cjs，6组通过，约1.3秒，含36入口组合及真实环境schema |
| 表单Vitest（happy-dom） | 2文件17项通过，包括3项新适配／默认值／超限异步测试 |
| Server／Web构建 | 各通过一次，Server产物复用；Web11任务、0缓存、16.817秒 |
| Web类型检查 | pnpm --filter @dev-platform/admin-web typecheck通过 |
| API契约／边界 | pnpm exec tsx scripts/api.ts --check及pnpm check:boundaries通过 |
| Knip加载 | pnpm --filter @vben/vsh exec knip --help显示帮助、退出0，不代表全仓未使用代码检查 |
| 真库集成 | pnpm exec tsx tests/integration.ts，30组通过，含初始化／迁移、来源／权限／会话／并发／回滚 |
| 完整E2E | pnpm test:e2e，7项通过，1.9分钟；含登录／滑块、直连API授权、偏好／全屏／通知入口／锁屏 |
| 格式／correctness | 两个新增测试oxfmt／oxlint通过 |
| 差异／追溯 | 交付时核对锁／补丁摘要、链接、状态与git diff --check；不因文档修改重跑业务套件 |

## 独立安装与失效阻断

仓库外的自有临时项目安装3个相同包及补丁，实际Zod3／Zod4-v3和deepmerge行为通过。首次离线尝试因默认镜像缺metadata受阻，未误记通过；固定官方npm源后安装成功。该检查不是全仓无缓存安装。

仅在该临时项目破坏补丁原始上下文后，离线安装以ERR_PNPM_PATCH_FAILED退出1，证明不能静默跳过不匹配补丁。主项目补丁／node_modules不变，临时项目已清理；诊断摘要在结构化证据中。

## 环境、边界与回退

Node24.22.2／pnpm10.33.4，专用MySQL13307／API4311／Web5778，集成与E2E串行、构建先于浏览器。已停止测试MySQL并保留卷；未操作开发库／真实管理员、重启日常服务或发布。日常旧进程需正常重启才加载新依赖。

既有工具peer警告、Linux／WASM回退、镜像与完整许可分发仍未由本批验证，不将报告写成生产放行。新公告按ID／条件重审，本补丁不是包名豁免。回退只撤销E批约束、patchedDependencies／patches及锁，保留A—D与用户改动；回退恢复风险阻断，不reset仓库。

E批完成不等于DP-002整体闭项：002.3发行物最小化／镜像与许可证分发仍须逐项批准并验证。正式AC矩阵保持待验，旧审查快照及历史报告不覆盖。
