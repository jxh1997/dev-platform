# DP-002.2-C 依赖与构建链修复

日期：2026-11-12（Asia/Shanghai）；批准A-005：用户在B批交付、请求确认C批具体计划后回复“继续”。本批按[闭项计划](2026-11-12-risk-closure-plan.md)实施；D／E与发行物未获实施批准。工作区未提交，保留既有A／B批及文档改动。

## 变更与范围

- 修复C批26个命中模块，具体版本与原计划一致。Vue runtime／compiler／shared／server-renderer统一3.5.45；intlify运行家族／vue-i18n统一11.4.18；Tiptap家族统一3.33.1，ProseMirror view1.42.9；Vite8.3.8与相关工具链更新。
- catalog采用审查版本；对旧版本采用精确匹配override，保留同包其他版本分支。共73条旧版本约束，合并到72个不同目标name/version；pnpm10.33.4生成锁，未手改锁或执行audit fix。未改变Vben来源版本／commit。
- 锁内新增163个、移除137个package键，包含平台可选包，不等于163个新业务依赖。差异为批准依赖、同步家族及必要传递依赖：Babel辅助包／解析器、Browserslist数据、Tiptap与ProseMirror配套、Vite→rolldown1.2.19／lightningcss1.33.0／picomatch4.0.7／tinyglobby0.2.17、SVGO→css-select6／css-what7等。完整package键差异保存在结构化证据，不隐藏间接主版本变化。
- 核实glob10／11／13、minimatch原有分支、Zod3／4及deepmerge仍保持原版本；未提前执行D／E批。
- Vue新版类型检查发现4处既有共享组件声明不兼容。按计划“必要共享适配”修正：`collapsible-params.vue`对象默认值、`sidebar.vue`数组默认值改工厂；`collapsible.vue`和`expandable-arrow.vue`的defineModel显式指定boolean，避免固定true／false推断。仅4文件8增6删，无新页面或权限行为。
- 新增`tests/buildchain-dependency.cjs`：5项限时隔离回归，覆盖brace2／5非展开组指数复杂度场景、YAML3／4与TOML配置正常／错误／原型键、SVGO命名空间和控制字符链接、CSS选择器及安全序列化。每项独立子进程最多5秒，不把潜在DoS样本传给开发服务。

## 实际验证

| 命令／检查 | 结果 |
|---|---|
| 官方注册表查询 | 49个初始包／分支版本存在，核对engines／peer／依赖；其余同步家族由pnpm实际解析／完整性及安装后manifest核实。查询字段见[注册表证据](2026-11-12-buildchain-registry.json) |
| `pnpm install --lockfile-only --ignore-scripts` | 通过，21.2秒；保留原锁与workspace输入摘要 |
| `pnpm install --frozen-lockfile --ignore-scripts` | 通过，22.5秒；不执行全工作区postinstall，不代表无缓存／Linux镜像安装通过 |
| 请求／颜色／偏好配置／表单API定向Vitest | 首次默认Node环境：7文件62项通过，偏好preferences文件14项因document／window不存在失败；同一失败文件改用happy-dom重跑26项全部通过。合计8文件76项最终均通过，未修改断言或生产代码来规避测试环境 |
| `node --test tests/buildchain-dependency.cjs` | 5项通过，约0.31秒；初次YAML夹具的子进程字符串换行转义错误已修正，保留原配置／错误断言 |
| `pnpm build:server` | 通过一次，后续契约／集成／E2E复用新鲜产物 |
| `pnpm --filter @dev-platform/admin-web typecheck` | 首次失败后修复上述4处模型声明，重跑通过；没有any、忽略错误或关闭类型检查 |
| `pnpm build:web` | 初次11任务、0缓存、16.852秒；因4处兼容源码变化重建一次，11任务通过、5缓存、9.115秒。未在浏览器运行时重建 |
| API契约／边界 | `pnpm exec tsx scripts/api.ts --check`／`pnpm check:boundaries`通过，契约未漂移 |
| `pnpm exec tsx tests/integration.ts` | 真实MySQL30组通过，含路由／来源／权限／会话／并发／回滚；故障注入中的预期安全500不视为未知错误放行 |
| `pnpm test:e2e` | 全部7项通过，1.9分钟；覆盖authorization／framework／shell三份规格，含登录、直连API授权、偏好／全屏／通知入口／锁屏与滑块 |
| 修改文件oxfmt／oxlint | 4个Vue文件及新增测试格式／correctness检查通过 |
| 目标版本与许可 | 72个目标name/version的本地manifest版本与约束一致，均有许可字段及独立原文文件；不是完整发行物SBOM或许可证分发验收 |

## 审计差分与剩余风险

`pnpm audit --prod --json`返回有效JSON、退出1。公告记录从125降至5：**移除C批26模块的120条，无新增公告，剩余5条经findings／paths排序后与前次快照字段完全一致**。

metadata口径：critical0／high3／moderate6／low1（前次0／62／47／21）。metadata计数与5条公告记录不是同一口径，不解释为独立CVE数，也不称剩余只有3个漏洞。目标node-forge1.4.3已实际无命中，包括原patched_versions为无版本但affected<=1.4.0的记录；此结论来自实际审计版本范围匹配，不宣称本地重现全部加密／TLS问题。

| 剩余模块 | 公告记录／严重性 | 下一批 |
|---|---|---|
| glob | 2条：high／moderate | D：CLI命令处理与AbortSignal遍历问题，按父包审查跨主版本 |
| minimatch | 1条：moderate | D：模式放大，跨主版本兼容 |
| zod | 1条：high | E：受限集合资源消耗及v3表单适配 |
| deepmerge | 1条：low | E：原型污染，无上游修复版本，单独补丁／移除路径 |

实际移除／剩余公告、完整路径、输入摘要、安装后许可及锁package差异见[结构化证据](2026-11-12-buildchain-dependency-fix-data.json)。安全回归参考[brace-expansion上游公告](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp)、[SVGO上游公告](https://github.com/advisories/GHSA-w27v-7q3p-w38r)；SVGO测试不将优化器宣称为全面SVG净化服务。

## 兼容警告与未验证项

安装仍有工具链peer警告。Vite inspect／dev-rpc等仍声明旧Vite范围；当前Node24／macOS实际构建、开发服务器和E2E验证其已覆盖路径，不视为全部插件兼容保证。新rolldown可选WASM链携带`@napi-rs/wasm-runtime@1.2.6`及`@emnapi/core／runtime@2.0.0-beta.2`，与其他既有WASM消费者的1.x peer声明存在警告；这是批准Vite升级带来的传递解析，未升级knip等无关根工具。当前Darwin原生构建已验证；Linux／WASM回退、完整镜像及其他未执行工具入口仍待发行物批次验证，不能据此声称无peer风险。

许可证登记：MIT66、BSD-3-Clause4、Apache-2.0 1、`(BSD-3-Clause OR GPL-2.0)`1（node-forge，保留原双选表达式）；未擅自判为GPL-only。平台可选包及全发行清单由002.3处理，第三方声明尚未代表全图完成。

## 环境、回退与交接

Node24.22.2／pnpm10.33.4；测试MySQL13307、API4311、Web5778。数据库集成与E2E串行，构建先于E2E；结束停止专用MySQL并保留卷，不操作开发库、真实管理员或生产环境。日常服务未主动重启，旧进程需要正常重启加载新依赖。

回退仅撤销C批catalog／精确override、4处兼容修订及对应生成锁，保留A／B修复和用户改动；不可reset整个工作区。回到旧依赖恢复相应风险阻断。不声称迁移、发布、镜像重建或完整产品验收已完成。

C批完成不等于DP-002闭项：D／E／发行物须逐批确认实施，未解决高危不以免责声明放行。当前剩余风险继续登记，不修改旧审查快照或正式AC矩阵为通过。
