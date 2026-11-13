# M0 依赖审计记录

日期：2026-11-10。命令：`pnpm audit --prod --json`。这是整个 pnpm 工作区的生产依赖图，其中包含构建／格式工具工作区本身的 dependencies；不等于每个条目都能在当前业务端点中被利用，也不代表无需处理。

## 已处理

- NestJS 11.1.6 → 11.2.9、Swagger 11.2.0 → 11.4.8、Express 5.1.0 → 5.3.0、TypeORM 0.3.27 → 0.3.31、mysql2 3.15.3 → 3.23.1。均保留当前服务端主版本。
- tar 7.5.15 → 7.5.21、tinypool 2.1.0 → 2.1.2，显式覆盖当前依赖图中的构建工具间接版本；源码来源 v5.7.0 未升级。
- 修复后重新执行安装、类型、契约、真实数据库与浏览器验证，结果见主验证报告。

## 剩余结果

审计元数据条目数：critical=0，high=72，moderate=61，low=18。不能将 critical=0 表述为无漏洞。

| 涉及 high 的依赖 | 审计建议修复范围（原样记录） |
|---|---|
| @intlify/core-base | >=11.4.14 |
| @intlify/shared | >=11.4.14 |
| @tiptap/core | >=3.30.5 |
| @vue/server-renderer | >=3.5.42 |
| axios | >=1.18.0；>=1.20.0 |
| brace-expansion | >=2.1.2；>=2.1.3；>=2.1.4；>=2.1.5；>=2.1.6；>=5.0.10；>=5.0.11；>=5.0.7；>=5.0.8；>=5.0.9 |
| browserslist | >=4.28.7 |
| fast-uri | >=3.1.3；>=3.1.4；>=3.1.5；>=3.1.6；>=3.1.7 |
| follow-redirects | >=1.16.1；>=1.16.2 |
| form-data | >=4.0.6 |
| glob | >=10.5.0 |
| immutable | >=5.1.8 |
| js-yaml | >=3.15.0；>=3.15.1；>=3.15.2；>=4.3.0；>=4.3.1；>=4.3.2 |
| nanoid | >=3.3.16；>=3.3.18 |
| node-forge | <0.0.0；>=1.4.1 |
| path-to-regexp | >=8.4.0 |
| postcss | >=8.5.18 |
| prosemirror-view | >=1.42.3 |
| smol-toml | >=1.7.1 |
| source-map-js | >=1.2.2 |
| svgo | >=4.0.2；>=4.1.0 |
| undici | >=7.28.0；>=7.29.0；>=7.29.1；>=7.30.1 |
| vite | >=8.1.6 |
| vue-i18n | >=11.4.14 |
| zod | >=4.6.6 |

包含固定前端的浏览器／构建依赖、未启用模块的依赖及部分服务端间接依赖。例：Zod 审计建议涉及主版本变化，不能在固定前端基础上盲目全量 audit fix；SSR、开发服务器和工具 CLI 的实际可达性也需逐项核查。

当前用途是隔离开发和 M0 验证。正式生产发布前必须单独完成剩余依赖修复／可达性评估与回归，不能以当前启动成功替代生产安全验收。下次依赖改动后重新审计并更新此记录。

审计修复依据含 [tar 公告](https://github.com/advisories/GHSA-23hp-3jrh-7fpw)、[tinypool 公告](https://github.com/advisories/GHSA-85c8-ppgw-ccpr)、[TypeORM 公告](https://github.com/advisories/GHSA-2rp8-mm9q-fp49)、[mysql2 公告](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3)。

## 后续审查

2026-11-12 已完成 [DP-002.1现状审查](2026-11-12-dependency-review.md)：本文件保留2026-11-10历史统计，不覆盖为新结果。当前风险与修复建议以上述新报告为准；尚未实施升级或完成DP-002闭项。

## 2026-11-12 首批定向修复结果

A-003批准的DP-002.2-A已完成：仅router2.2.0的path-to-regexp固定至8.4.2，Vben来源保持不变。目标两条公告已移除；审计仍有其他风险，前文历史快照保持原口径。当前锁文件SHA-256：`d7f60fe1453782556a805ff8feba651ea8fc75805b2afd942c167d9a7a3fa1e9`。变更、回归、30组集成及1项授权E2E证据见[修复报告](2026-11-12-router-dependency-fix.md)。未发布，DP-002尚未闭项。

## 2026-11-12 B批请求链修复结果

A-004批准B批四依赖修复已验证；28条目标公告消除，剩余125条，metadata high62／moderate47／low21／critical0。保持Vben来源及A批修复；当前锁SHA-256：`bab7b36092e812c1e8a6717f99b24d790975a9547617c50178da1489323f0e3e`。实际变更、测试与差分见[报告](2026-11-12-request-dependency-fix.md)，不替代前文历史快照。DP-002仍未闭项，未发布。

## 2026-11-12 C批依赖与构建链修复结果

A-005批准C批已完成验证，26模块120条目标公告消除；剩余5条公告，metadata high3／moderate6／low1／critical0。Vue／国际化／Tiptap家族同步，Vben来源不变；4处模型声明已兼容适配。当前锁SHA-256：`1d507d3505f8579f1a8a60d2b39327d258210685229bba85279489bb5ed4ae77`。实际变更、76项定向测试、5项安全回归、30组集成及完整7项E2E见[报告](2026-11-12-buildchain-dependency-fix.md)。peer警告及发行物验证边界保留，DP-002未闭项、未发布，前文保留历史口径。

## 2026-11-12 D批模式解析修复结果

A-006批准D批已验证；按父包约束升级glob14.0.5／minimatch11.0.8，3条目标公告消除，无新增；剩2条Zod／deepmerge公告，metadata high2／moderate0／low1／critical0。锁SHA-256：`4e55c5c7f68ee36271600d7084f54ee7ed037afffce2d0a23a7d5637a765c2a7`。6项限时回归、两端构建及30组集成见[报告](2026-11-12-pattern-dependency-fix.md)；Vben／Zod／deepmerge保持既有版本，E批和发行物仍待逐项确认，DP-002未闭项、未发布。

## 2026-11-12 E批补丁修复结果

A-007批准：Zod4分支4.6.7、Zod3及Zod4-v3兼容层／deepmerge共3份补丁已安装验证，原许可保留。原始audit仍有2条版本告警、退出1（metadata high1／moderate0／low1／critical0）；两条分别有补丁处置证据，不能将原始计数写成0。锁SHA-256：ce5af43a90ddc9827bc75ba69e05010c04945a5f2dc123a4793f4927028c23bd。36入口／6组安全、17表单、30集成及7项E2E等结果见[报告](2026-11-12-schema-merge-fix.md)；Vben与表单peer不变，发行物／镜像／完整许可分发待002.3，DP-002尚未闭项。

## 2026-11-12 发行物实测与OS门槛

A-008验证Server199依赖／Web实际bundle79许可、两端镜像及7组真实运行链路通过。原始OS扫描：Server219条包-CVE记录（critical1／high34），Web185条（critical3／high55）；不是独立漏洞数。Server严重项有Debian不受影响证据单列，其他OS门槛未通过，不以npm补丁结果替代。见[报告](2026-11-12-release-artifact-review.md)及逐条证据。基础系统差异未批准实施，DP-002未闭项／未发布。

## 2026-11-12 基础系统差异验证

A-009批准的新Server／Web镜像均无critical／high匹配，真实7组链路及系统专项通过；Server保留24 medium／12 low／2 unknown，Web原始匹配全部0。2条glibc unknown未获修复／不受影响证据，DP-002.3-b及父任务继续阻断。npm原始2条版本告警及A-007补丁处置口径不变。见[最新报告](2026-11-12-runtime-base-fix.md)，未发布。
