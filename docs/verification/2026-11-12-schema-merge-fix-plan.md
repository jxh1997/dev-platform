# DP-002.2-E Zod与deepmerge修复细化计划

日期：2026-11-12；版本1.1；级别T3。**原v1.0方案经A-007确认并已实施验证。** 用户在E批具体确认请求后回复“继续”；不授权发行物或发布。以下步骤为获批方案，结果见末尾执行记录。

## 证据与最小方案

D批之后剩2条公告记录：Zod3.25.76／4.4.3的集合资源消耗，以及deepmerge4.3.1的返回对象原型污染。审计metadata high2／low1，不等同3条公告。原始记录与路径见[D批证据](2026-11-12-pattern-dependency-fix-data.json)。

- Zod3被根Server／database／共享form-ui及`@vee-validate/zod@4.15.1`、`zod-defaults@0.1.3`使用，后两者peer只接受v3。Zod4.4.3来自knip6.14.1。不能全局override v4破坏已有类判断、默认值和表单适配。
- 只读下载并在内存检查官方Zod4.6.7包：v4的`capSize`在超过已有max／length集合约束时，生成大小错误并在遍历元素前停止；无约束集合仍按原API正常解析。包内`v3/types.cjs`仍会在maxLength／exactLength错误后逐元素解析。因此“升级包再改用zod/v3”不是可信修复。[注册表及源文件摘要](2026-11-12-schema-merge-review-data.json)保留版本、完整性与SHA，不执行下载内容。
- deepmerge来源为`@rollup/plugin-node-resolve@16.0.3`，当前构建链使用其默认配置合并。`mergeObject`的目标字段复制绕过已有source属性保护，普通赋值可触发`__proto__` setter。上游暂无修复版本；只升级或声明未启用不算解决。

推荐：**维持Zod3表单契约，通过pnpm可追溯补丁回移已有集合上限的提前终止；Zod4分支升级4.6.7；deepmerge使用安全自有数据属性写入。** 不迁移整个表单框架，不增加全局任意集合长度限制，不改变数据库结构／权限／密码。

## 实施步骤与文件边界

1. 保存当前锁与workspace输入摘要。仅将`knip@6.14.1>zod`定向到4.6.7，Zod3 catalog维持3.25.76；由pnpm生成锁。核对未引入新的主版本根依赖或其他批次改动。
2. 通过`pnpm patch`／`patch-commit`维护Zod补丁，提交`patches/`、workspace的patchedDependencies及pnpm生成锁。对3.25.76的实际发行CJS／ESM／源码入口，回移“已有max／exact length超限则在子元素解析及Promise分配前返回大小错误”；检查Array／Set及包内附带v4集合入口的约束位置。Map等只有在该API确有大小约束时才能据约束提前终止，不能杜撰v3的max API。
3. 检查4.6.7的v4正常修复与包内v3兼容入口：v4原生修复复用；如v3兼容入口仍可绕过，按同一原则补齐其CJS／ESM／源码入口。不把“当前没导入”作为包内公开兼容入口的安全豁免。补丁记录上游依据、适用版本、文件摘要与复核／撤销条件，不修改包版本来伪装已由上游修复。
4. 通过pnpm patch维护deepmerge4.3.1补丁，覆盖实际入口`dist/cjs.js`、`dist/umd.js`和对应`index.js`源码中的目标复制与source合并写入。采用可枚举／可配置／可写的自有数据属性写入，使`__proto__`成为普通自有字段，避免原型setter；继续保留原有继承属性保护。不无条件删除constructor／prototype等合法配置键，不把普通输出全部改成null原型，不替换依赖库。
5. 新增定向验证入口（拟`tests/schema-merge-dependency.cjs`及共享表单的Vitest兼容测试），随后执行下表必要检查；补丁安装必须实际生效，不能只验证临时修改目录。必要时修改共享form-ui辅助测试以覆盖现有行为，业务代码无必要则不改；如果必须迁移表单适配／peer或改变全局解析策略，提交差异方案，不静默扩面。
6. 更新依赖与验证报告、逐条公告处置状态、TODO批准记录、原始审计数据与输入摘要。补丁升级条件与复核责任纳入报告；保留A／B／C／D及用户工作区改动。

## 验证场景与命令

| 范围 | 必要场景／操作 |
|---|---|
| Zod安全修复 | 有max／exact length集合超限时，通过子元素解析计数证明同步／异步均未遍历；错误路径／code／上限仍正确。受控规模的嵌套及不匹配元素，限时子进程／受限内存验证，不向业务API发送DoS样本。覆盖实际CJS与ESM入口、Zod3包的默认／附带v4及Zod4包的默认／v3兼容入口，不能仅看审计版本号 |
| Zod兼容 | 上限内数据、无上限集合、小于min、optional／nullable／default、refinement／transform、safeParse／parseAsync、错误路径保留；不同入口确有支持的API分别断言，不凭类型名称推断 |
| 表单与环境 | 实际vee-validate适配、zod-defaults默认值、必填／可选／嵌套表单、正常与错误提交；环境schema成功／拒绝非法输入，不读取真实配置到日志；knip用合成参数／help验证加载，不默认做全仓未使用代码扫描 |
| deepmerge安全 | 恶意own __proto__来自target／source、null原型输入、嵌套对象与数组；输出原型与全局Object.prototype均不被污染，继承字段不被复制；constructor／prototype数据、Symbol、自有字段枚举／可写语义、数组合并与自定义选项保持 |
| 安装与静态 | 生成锁、冻结安装；补丁清单／哈希／许可原文核对；Server与Web构建、Web类型检查、API契约与边界；新增／修改文件格式及correctness |
| 真实链路 | 复用一次新鲜Server构建，`pnpm exec tsx tests/integration.ts`30组；构建后串行执行`pnpm test:e2e`完整三份规格；必要表单适配Vitest使用happy-dom，不重复已通过的无关测试 |

已有命令为`pnpm build:server`、`pnpm build:web`、`pnpm --filter @dev-platform/admin-web typecheck`、`pnpm exec tsx scripts/api.ts --check`、`pnpm check:boundaries`、`pnpm exec tsx tests/integration.ts`、`pnpm test:e2e`。新增安全测试入口属于计划待实现，不填已执行。单元／安全回归先于构建，构建先于E2E；Server一次构建后复用。完整E2E上次1.9分钟，只作成本参考。

本地Node24.22.2／pnpm10.33.4，隔离MySQL13307／API4311／Web5778；结束停止测试服务并保留卷。不重启日常服务、不发布、不操作生产或真实管理员。

## 审计、闭项与停止条件

最后审计保留原始JSON及非零退出码。**pnpm版本审计可能继续报告已回移修复的Zod3与deepmerge版本；不得全局忽略、伪造版本或将原始计数改成0。** 每条处置必须关联补丁内容、实际安装入口、上游依据、定向否定回归、正常兼容与真实链路证据，原始命中数与已处置／未处置数分开报告。

Zod4版本命中应实际消除；Zod3／deepmerge若用补丁处置，只有全部相关入口验证后才标记“补丁修复已验证”，不能标为“上游版本无漏洞”。未覆盖入口、补丁未生效或兼容失败继续阻断。未来新公告不自动沿用本次处置，必须按ID与触发条件重审；补丁与升级后的文件无法匹配时安装应失败并重新审查。

所有必要检查通过即交付，不因追溯文档变化重跑全套。E批通过仍不代替002.3实际发行物最小化／镜像／许可证分发验证；DP-002保持未勾选，直到其余门槛都有实际证据。

## 回退

只撤销E批定向约束、patchedDependencies／patches及对应生成锁，保持已批准A—D和用户改动。回退会恢复已知风险阻断，不reset仓库、不删除测试或修改旧报告。无法以最小补丁保持契约时，停止该修复路径，提交v4／表单迁移差异供用户确认。

## 本轮只读动作

读取已安装包与父依赖源码、官方公告及Zod4.6.7公开tarball（内存审查，未安装／执行）；落地本计划及摘要证据。没有制作补丁、修改E批依赖／业务源码或运行E批验证。

## A-007执行记录

2026-11-12完成：Zod4分支4.6.7、3份补丁／12个安装后文件；36个schema入口组合与deepmerge／环境配置安全回归共6组、17项表单Vitest、两端构建／Web类型检查、契约／边界、30组集成、完整7项E2E通过。独立安装及故意上下文不匹配的ERR_PNPM_PATCH_FAILED阻断已验证。原始audit仍有2条版本告警、退出1，均逐ID记录为补丁修复已验证，不伪造0；发行物仍待确认。见[报告](2026-11-12-schema-merge-fix.md)。前文“本轮只读动作”为方案编制历史，不代表实施阶段。
