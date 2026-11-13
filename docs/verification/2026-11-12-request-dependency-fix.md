# DP-002.2-B 请求链依赖修复

日期：2026-11-12。批准A-004：用户对上一条B批四项依赖及验证方案回复“确认”。仅B批，C／D／E与发行物处置尚未批准。工作区未提交，保留既有改动。

## 实际变更

- catalog固定axios1.21.1、qs6.17.1。axios新版本的依赖约束自动解析follow-redirects至1.16.3、form-data至4.0.6，无需新增override。保留A批router修复；pnpm10.33.4生成锁，无手改锁或全量audit fix。
- 实际锁结构变化：上述版本及catalog、请求客户端／menu-ui的qs引用、VueUse／mock适配器axios peer引用。form-data新版本要求hasown2.0.4，导致同一es-set-tostringtag2.1.0解析到该版本；旧side-channel1.1.0失去引用被移除，已有1.1.1保留。无其他版本升级，详情见结构化数据中的lockChangedPaths。
- 新增`tests/request-dependency.cjs`，从共享请求包→axios实际依赖路径解析；覆盖multipart字段／文件名不能注入头、BIGINT字符串／重复参数序列化及原型污染输入、数组形式凭证头在跨主机重定向时剥离且普通头保留。仅使用合成数据、随机本地端口，不访问外部服务。
- 未修改应用请求／认证／权限业务、API契约、数据库、Vben来源或界面。现有共享库PUT／DELETE测试属于原有通用库测试，本次未新增业务方法，应用仍仅允许GET／POST。

## 验证

| 命令／检查 | 实际结果 |
|---|---|
| `pnpm install --lockfile-only --ignore-scripts` | 成功，17.6秒；仅生成锁；已有工具链peer警告继续登记，未在本批升级Vite等依赖 |
| `pnpm install --frozen-lockfile --ignore-scripts` | 通过；未执行无关安装脚本，不代表全新容器安装验证 |
| `pnpm exec vitest run packages/effects/request/src` | 4文件、28测试通过，覆盖GET／POST、网络失败／超时及上传下载／SSE等既有行为 |
| `node --test tests/request-dependency.cjs` | 3项安全／兼容测试通过；重定向用例超时5秒、请求超时2秒 |
| 新测试oxfmt／oxlint | 格式与correctness检查通过 |
| `pnpm build:server` | 通过，本批仅构建一次，复用产物 |
| `pnpm build:web` | 通过，11个任务、0缓存，12.578秒；未另跑全Web类型检查，C批再覆盖 |
| `pnpm exec tsx scripts/api.ts --check`／`pnpm check:boundaries` | 契约一致、边界通过 |
| `pnpm exec tsx tests/integration.ts` | 真实隔离MySQL全部30组通过，含来源／CSRF、权限、会话及事务回滚 |
| `pnpm test:e2e -- tests/e2e/authorization.spec.ts` | 1项通过，43.9秒；管理员配置与普通账号页面／直连API限制均通过 |
| 实际解析与许可 | 四项目标版本与计划一致，3项MIT／qs BSD-3-Clause，均有独立许可原文；不是完整发行许可验收 |

初次安全测试因macOS未配置127.0.0.2而无法绑定，属于夹具环境失败；改用本机IPv6 ::1到IPv4 127.0.0.1的真实跨主机重定向，保留原凭证剥离断言后通过，未修改系统网络或增加外部请求。新测试不证明已覆盖全部28条公告的每种触发条件，公告移除另以审计证据确认。

## 审计差分

本批审计返回有效JSON、退出1（仍有其他风险）。metadata：critical0／high62／moderate47／low21；前批为0／73／64／21。公告记录从153降至125，**仅移除本批4包28条，未新增公告，其余125条在findings／paths排序后全部快照字段一致**。目标四包均无剩余命中；metadata与公告记录数量不是同一口径，不称为独立CVE数。

完整被移除记录、输入／原始输出摘要、锁差异路径及许可见[差分证据](2026-11-12-request-dependency-fix-data.json)，原始基线见[依赖审查](2026-11-12-dependency-review.md)。安全回归依据：[form-data头注入公告](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx)、[follow-redirects数组头公告](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8)。

## 运行、范围与后续

验证环境：Node24.22.2／pnpm10.33.4，MySQL13307、Web5778、API4311。集成与浏览器串行，构建先于浏览器；未改开发库／真实管理员。测试结束停止专用MySQL并保留卷。日常服务未主动重启，旧进程须正常重启才能加载新依赖。

B批通过不等于DP-002闭项，125条其他公告仍由后续批次逐项处置。未做镜像重建／扫描、完整许可分发、生产发布、全7项UI回归或全Web类型检查。必要检查通过后停止，不因追溯文档变化重跑业务套件。

回退只撤销B批catalog并由pnpm恢复对应依赖，不撤销A批router修复或用户文档。退回有漏洞版本须恢复风险阻断；不得reset整个工作区。

最终收敛：核实axios1.21.1自带follow-redirects ^1.16.2／form-data ^4.0.6后，移除临时的冗余旧版本override，离线重新生成锁并通过冻结安装。仅删除这两项无效约束，实际包／快照／消费者解析不变，复用已完成业务验证；最终输入重新审计，125条公告内容及metadata计数排序归一后与前次一致。
