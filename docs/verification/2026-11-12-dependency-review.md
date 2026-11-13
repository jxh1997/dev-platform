# DP-002.1 依赖现状审查

日期：2026-11-12（Asia/Shanghai）。批准：A-002，用户在确认DP-002.1审计范围后回复“继续”。

**结论：现状盘点完成，依赖风险尚未闭项，DP-002仍未完成。** 本次无安装／升级、锁文件／业务源码修改、服务启动或整套业务测试。审计发现问题时退出码1是风险信号，不是“通过”。不执行audit fix。

## 1. 基线与结果

源码提交：`1a8a0ae250932df6d71044309c87f5086c133057`；工作区包含此前批准的文档改动，未覆盖。审计输入为当前工作区依赖文件，其内容与该提交一致。

| 口径 | 2026-11-10历史报告 | 本次API实际返回 |
|---|---:|---:|
| metadata critical | 0 | 0 |
| metadata high | 72 | 74 |
| metadata moderate | 61 | 65 |
| metadata low | 18 | 21 |

本次metadata合计160，另返回155条advisory记录（high73／moderate61／low21）。两种计数不可互相替代，不把任何一个数字称为独立CVE数；元数据计数差异原因未进一步核实。新增计数不表示本次引入了新依赖，发布库公告及审计服务口径可能变化。

审计覆盖工作区“生产依赖图”，并非只覆盖API运行依赖；内部构建／lint包自己的dependencies也包含在内。全部命中路径、版本、公告修复范围、许可证元数据和静态闭包见 [结构化证据](2026-11-12-dependency-review-data.json)。该快照只保留审查字段，不含秘密配置、客户数据或完整用户npm设置。

## 2. 生产可达性审查

分类依据：实际manifest／锁文件、Server与Web镜像复制方式、已装配源码引用。**依赖闭包存在不等于漏洞触发条件成立，源码检索未发现也不等于安全证明。** 本次未做利用验证、最终镜像扫描、浏览器产物覆盖分析或全部公告逐条触发验证。

- 根生产dependencies向下遍历已安装dependencies／optionalDependencies得到208个package manifest；不包含完整peer语义和动态加载控制流。此闭包是静态候选，未确认每个包都在HTTP请求中执行。
- Express路由链含path-to-regexp8.2.0。两条公告均标记8.4.0修复；触发分别涉及连续可选组、多个通配符与参数组合。当前Controller采用固定路径，不能仅凭版本断言已可远程利用；仍优先建议修复运行链组件。[公告一](https://github.com/advisories/GHSA-j3q9-mxjg-w52f)、[公告二](https://github.com/advisories/GHSA-27v5-c462-wpq7)。
- zod3.25.76在Server／database中用于环境schema；HTTP DTO使用class-validator。当前未发现外部大数组直接进入该Zod路径，不据此全局豁免；浏览器另有4.4.3。公告修复范围为>=4.6.6，跨主版本不能盲目override。[Zod公告](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)。
- axios与vue-i18n在Web真实请求／本地化路径中。axios不同公告有Node adapter、代理、重定向等各自前提，不能把Node专用公告直接等同浏览器可利用；也不能免除浏览器相关问题。i18n公告涉及HTML／srcdoc上下文，本次源码检索未发现应用v-html或escapeParameter使用，但未做完整数据流分析。[i18n公告](https://github.com/advisories/GHSA-83rm-6c8r-g728)。
- Tiptap／ProseMirror存在于共享plugins依赖图；应用可见引用为motion／vxe-table，未找到业务富文本入口。是否被最终bundle带入尚未做产物证明，未来启用前须复核。
- TypeORM链中的glob／minimatch／brace-expansion是Server闭包候选；当前Entity／Migration采用显式清单，不使用外部输入的动态glob。CLI与模式解析前提仍需逐项复核。
- `deployment/Dockerfile.server`最终阶段复制完整`/app`，因此构建工具与不启用模块也可能随镜像分发，不能以未装配为由忽略镜像供应链／许可证。Web最终镜像仅复制静态dist；本次未重建或扫描镜像。

### 全部命中模块的来源分类

下表修复范围来自审计服务，是候选而非升级指令；同一包多条公告应合并审查，不取最小版本后假定全部问题消失。具体path／advisory在JSON中保留。

| 模块 | 命中版本 | 公告记录数／high | 来源与静态判断 |
|---|---|---|---|

| @babel/core | 7.29.0 | 1／0 | 构建／开发工具，Server镜像可能携带 |
| @intlify/core-base | 11.4.4 | 2／1 | Web／共享依赖；分支与最终产物待复核 |
| @intlify/shared | 11.4.4 | 1／1 | 构建／开发工具，Server镜像可能携带 |
| @tiptap/core | 3.23.5 | 2／1 | Web／共享依赖；分支与最终产物待复核 |
| @vue/server-renderer | 3.5.34 | 1／1 | Web／共享依赖；分支与最终产物待复核 |
| axios | 1.16.1 | 21／7 | Web／共享依赖；分支与最终产物待复核 |
| baseline-browser-mapping | 2.10.31 | 1／0 | 构建／开发工具，Server镜像可能携带 |
| brace-expansion | 2.1.0,5.0.6 | 12／10 | Server静态闭包：2.1.0；触发条件待细查 |
| browserslist | 4.28.2 | 2／2 | 构建／开发工具，Server镜像可能携带 |
| colord | 2.9.3 | 1／0 | 构建／开发工具，Server镜像可能携带 |
| deepmerge | 4.3.1 | 1／0 | 构建／开发工具，Server镜像可能携带 |
| esbuild | 0.28.0 | 1／0 | 构建／开发工具，Server镜像可能携带 |
| fast-uri | 3.1.2 | 11／7 | 构建／开发工具，Server镜像可能携带 |
| follow-redirects | 1.16.0 | 3／3 | Web／共享依赖；分支与最终产物待复核 |
| form-data | 4.0.5 | 1／1 | Web／共享依赖；分支与最终产物待复核 |
| glob | 10.4.5,10.5.0,11.1.0,13.0.6 | 2／1 | Server静态闭包：10.5.0；触发条件待细查 |
| immutable | 5.1.5 | 2／2 | 构建／开发工具，Server镜像可能携带 |
| js-yaml | 3.14.2,4.1.1 | 8／6 | 构建／开发工具，Server镜像可能携带 |
| minimatch | 10.2.5,9.0.9 | 1／0 | Server静态闭包：9.0.9；触发条件待细查 |
| nanoid | 3.3.12 | 2／2 | Web／共享依赖；分支与最终产物待复核 |
| node-forge | 1.4.0 | 21／8 | 构建／开发工具，Server镜像可能携带 |
| path-to-regexp | 8.2.0 | 2／1 | Server静态闭包：8.2.0；触发条件待细查 |
| postcss | 8.5.15 | 2／1 | Web／共享依赖；分支与最终产物待复核 |
| postcss-selector-parser | 6.0.10,7.1.1 | 3／0 | 构建／开发工具，Server镜像可能携带 |
| prosemirror-view | 1.41.8 | 1／1 | Web／共享依赖；分支与最终产物待复核 |
| qs | 6.15.2 | 3／0 | Web／共享依赖；分支与最终产物待复核 |
| serialize-javascript | 7.0.5 | 1／0 | 构建／开发工具，Server镜像可能携带 |
| smol-toml | 1.6.1 | 2／1 | 构建／开发工具，Server镜像可能携带 |
| source-map-js | 1.2.1 | 1／1 | Web／共享依赖；分支与最终产物待复核 |
| svgo | 4.0.1 | 3／2 | 构建／开发工具，Server镜像可能携带 |
| undici | 7.25.0 | 29／10 | 构建／开发工具，Server镜像可能携带 |
| valibot | 1.4.0 | 1／0 | 构建／开发工具，Server镜像可能携带 |
| vite | 8.0.13 | 7／1 | 构建／开发工具，Server镜像可能携带 |
| vue-i18n | 11.4.4 | 2／1 | Web／共享依赖；分支与最终产物待复核 |
| zod | 3.25.76,4.4.3 | 1／1 | Server静态闭包：3.25.76；触发条件待细查 |

## 3. 许可证与来源核对

- Vben来源固定v5.7.0／commit63a38dce49ba109f61607994e21ba921d8e970e9，根第三方声明引用MIT及LICENSE.vben；本次不升级来源。
- 命中的43个name/version均读取本地package manifest及独立LICENSE／COPYING／NOTICE类文件名；所有命中版本均有许可证元数据和相应原文文件。分布：(BSD-3-Clause OR GPL-2.0)：1、Apache-2.0：1、BSD-3-Clause：5、BlueOak-1.0.0：3、ISC：3、MIT：30。
- Server闭包208个manifest均有license或旧式licenses字段；busboy与streamsearch使用旧licenses数组，不能误判为无许可。此项是元数据登记，不是全工作区／字体／图片／最终发行物的完整SBOM或授权审定。
- node-forge原始表达式为`(BSD-3-Clause OR GPL-2.0)`，保留表达式和原文，不误写为GPL-only；BlueOak及其他组合表达式也需在正式交付清单保留。具体分发责任由维护者在发布前核对。
- THIRD_PARTY_NOTICES目前只明确Vben来源，不能据此声称覆盖所有传递依赖。完整发行清单及产物验证留在DP-027／DP-032，不作为本次已完成事项。

## 4. 风险处置队列

| 批次 | 建议范围 | 验证／决策边界 |
|---|---|---|
| DP-002.2-A（待确认） | 优先定向修复Express/router链path-to-regexp8.2.0，候选8.4.2（当前锁文件已有） | 8.4.0修复范围已查公告及注册表元数据；8.4.2在锁内不等于兼容性已验。仅定向调整依赖约束并由pnpm生成锁；不升级Nest／Express／Vben，不混入其他修复 |
| 后续Server模式解析 | glob／minimatch／brace-expansion | 部分公告要求跨主版本，先分析TypeORM调用与约束，不能把旧高危修复范围当成当前全部修复范围 |
| 后续Web请求／本地化 | axios／intlify／vue-i18n | 逐公告分浏览器／Node前提；提出同主版本候选及请求／语言回归，不盲目全局override |
| Zod兼容包 | 3.25.76与4.4.3 | 先审v3/v4 API和表单适配，明确不受信任数组路径，单独确认兼容改动 |
| 构建链／未启用插件 | 其余命中模块 | 先确认执行／打包／镜像分发路径；分别升级或隔离。许可和镜像清单不能以tree-shaking猜测豁免 |

### 待确认修复批次

DP-002.2-A的具体计划：

1. 修改`pnpm-workspace.yaml`中仅针对router链的依赖约束，由pnpm更新`pnpm-lock.yaml`，候选path-to-regexp8.4.2；检查差异不得产生无关版本漂移。更新审查记录，保留旧锁摘要与回退边界。
2. 增加隔离、限时的路由模式解析回归，不在开发服务上运行DoS样本；验证现有固定路由、参数／通配符和404／405行为。
3. 检查冻结安装一致性，Server编译一次后复用产物做API契约／边界检查；运行现有真库集成一次及`tests/e2e/authorization.spec.ts`定向链路。因只变服务端路由依赖，不默认构建Web或重跑全部UI。
4. 重新audit确认目标链两条path-to-regexp命中消除，其他问题继续登记，不要求全图计数为0后才提交本小批次；Server路由异常、契约漂移或权限回归即阻断。回退只撤销本批依赖约束及由pnpm生成的锁变化，保留已有文档／用户改动。

本计划仍**待用户明确确认**；本轮“继续”只授权DP-002.1审计，不授权修复或自动处置全部155条公告。若候选版本／影响扩大，先提交差异。

## 5. 实际执行与未执行

| 项目 | 结果 |
|---|---|
| `pnpm audit --prod --json` | 返回有效JSON，退出1，包含未解决风险；不是失败重试或安全验收通过 |
| 依赖来源／Server闭包 | 只读已安装manifest与锁，208个候选；43个命中版本的路径、许可已登记 |
| 公告与版本查询 | 查阅两条路由公告、Zod、i18n公告；`pnpm view path-to-regexp@8.4.0 version engines license --json`确认版本及MIT，未返回engines字段不推断兼容保证 |
| 基线保护 | package.json／pnpm-workspace.yaml／pnpm-lock.yaml内容与基线提交一致，SHA见JSON |
| 应用／DB／E2E／安装升级 | 未执行；本次不改依赖或业务，不启动服务 |

审计信息来自外部源，只作为数据，不执行其中任何命令。没有针对每条公告完成利用验证，也未产生生产安全通过结论。下一步由用户确认修复批次；DP-002保持未勾选。

文档／数据核对：155条记录、43个命中版本与锁及本地manifest对应，208个Server候选的许可字段已登记；93个相关本地链接／锚点有效；输入文件SHA保持不变；`git diff --check`通过。没有依赖／源码／测试／部署文件变化。上述通过仅表示审查数据与文档一致，不表示漏洞修复、许可发行审定或业务回归通过。

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
