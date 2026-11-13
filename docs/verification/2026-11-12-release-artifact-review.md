# DP-002.3 发行物与许可验证

日期：2026-11-12；批准A-008：用户对“发行镜像与许可证分发验证”回复“继续”。
**应用发行物已实现并验证；基础系统安全门槛未通过，DP-002.3及DP-002均不勾选。**
未发布／推送镜像，未更换基础系统方案或接受未修复风险。

## 已落地

- Server 从复制完整工作区改为 scripts/prepare-release.mjs 解析实际生产依赖及可解析peer，保留pnpm相对依赖链接；只带dist、199个依赖记录、必要许可／补丁和最小运行manifest。不分发工作区Web／TS源码、配置或构建工具；移除运行层npm／Corepack／Yarn。
- 原编译版数据库CLI路径保留，迁移／初始化无新增框架、迁移或密码策略。运行用户node、只读根文件系统、零有效capabilities及NoNewPrivs已实际检查。
- Web 使用既有Vite8.3.8的build.license，按实际bundle生成79条许可记录，不将整工作区依赖冒充浏览器内容。生产build增加分发处理；Turbo按任务跟踪准备脚本、许可来源／声明及补丁，避免旧许可产物被缓存复用。
- 两端构建在安装前复制patches，冻结安装时应用E批补丁；不复制本机.npmrc，使用公开npm源。Docker上下文排除本地环境、依赖／dist／缓存、验证归档等。
- 分发third-party/packages.json、licenses原文、files摘要、实际相关patches及维护说明；Web另有实际bundle原始许可JSON、public资源摘要。主声明THIRD_PARTY_NOTICES.md已更新。
- @tokenizer/token0.3.0、cookie-signature1.0.6、TypeORM0.3.31补齐对应上游固定提交原文；TypeORM annotated tag使用peeled commit。zod-defaults0.1.3发布README明确MIT但未附链接的LICENSE，原始声明与SPDX标准条款分别保留，不编造版权持有人。来源、摘要及该例外标注见deployment/licenses/sources.json。
- 缺元数据／原文或摘要不符会拒绝生成，不默认猜MIT。首轮真实缺项导致生成失败，补齐证据后通过。Server原Node版权文件及88份系统copyright文件仍在；系统包许可的完整分发复核仍随基础层后续收口，不仅凭npm材料宣称系统完整闭项。

## 实际构建与功能验证

平台linux/arm64，Node24.22.2／pnpm10.33.4。复用已验证Node版本的dev-platform-dependency-cache:verified构建缓存；不是无缓存默认基底构建。安全补丁及锁仍实际安装；未发布为正式版本。

| 项目 | 实际结果 |
|---|---|
| Server镜像 | dev-platform-server:dp0023，ID见结构化证据；99,154,783字节，原alpha镜像366,981,586字节，约减少73% |
| Web镜像 | dev-platform-web:dp0023；22,779,384字节，含完整本批应用许可材料 |
| 首轮Web构建 | Docker并行tsdown遭SIGKILL；停止未完成构建，改为workspace stub与Turbo单任务构建，未降低检查 |
| 最终Web构建 | 11任务全部成功、0缓存、30.01秒；包含实际Vite bundle许可与后处理 |
| 主项目冻结安装 | pnpm install --frozen-lockfile --offline --ignore-scripts通过 |
| 格式／correctness | 准备脚本、真实镜像验证脚本oxfmt／oxlint通过；git diff --check通过 |
| 专用运行环境 | compose.release-test.yaml，独立项目／网络／MySQL卷，API4312／Web5779；不暴露数据库端口 |
| 实际镜像测试 | node tests/release-runtime.cjs，7组通过：见下方 |
| 日常服务／生产 | 未重启／修改日常服务、开发库、真实管理员；测试服务已停止并保留专用卷，未部署生产 |

7组实际验证：非root／只读／NoNewPrivs／零有效capabilities及许可摘要；编译迁移／管理员初始化；真实滑块／首次改密／管理员接口；普通账号SELF读取200、管理接口与伪造写入403且AUTHZ_DENIED；未登录401、刷新／撤销；每份Web许可通过Nginx返回且内容SHA一致（避免SPA fallback假200）；Playwright对真实构建静态镜像登录，设备页可见、写按钮和用户管理入口不可见。

仅使用release_fixture_*及随机合成账号。测试最初漏带角色创建幂等键，接口正确拒绝400；补齐请求契约后通过，未改生产行为。截图等待loading／通知消失后保存，已查看，只有合成数据：
[普通账号实际镜像页面](2026-11-12-release-member.png)。

没有重跑未改动的全工作区测试或整套7项UI规格：本批走实际镜像的定向浏览器和HTTP链路，不将此前E批源码环境结果冒充容器结果。生产HTTPS／跨架构及正式AC签署未验。

## 镜像扫描及阻断

使用官方Trivy0.76.2固定镜像摘要，下载数据库与扫描分离；扫描阶段network=none，仅挂载本地镜像归档和只读DB，不挂Docker socket、不上传源码／镜像。版本、DB时间、镜像ID／大小、全部规范化扫描条目及原始JSON摘要见[证据](2026-11-12-release-artifact-data.json)。

| 实际产物 | 原始OS记录 | critical／high／medium／low／unknown |
|---|---:|---|
| Server，Debian12.15 | 219 | 1／34／95／85／4 |
| Web，Alpine | 185 | 3／55／87／39／1 |

这些是包与CVE的匹配记录，含同一CVE跨多个二进制包重复，不是219／185个独立漏洞。Server另外识别200个Node包（含发行manifest），其DB未命中语言漏洞；Web该扫描只识别系统层，不等于浏览器bundle无漏洞。A—E的npm原始告警及补丁处置仍独立保留，不能用Trivy未命中覆盖。

Server严重项CVE-2023-45853有明确Debian说明：bookworm的zlib二进制未编译contrib/minizip，当前源包匹配不代表该二进制受影响；原记录保留并按此证据标记不受影响，未全局忽略zlib。见[Debian原始说明](https://security-tracker.debian.org/tracker/CVE-2023-45853)。其余高危仍未逐项闭合，不能仅称“工具未启用”而放行。util-linux在bookworm仍标为vulnerable，[上游状态](https://security-tracker.debian.org/tracker/CVE-2026-53613)；系统d相关记录同样保留[上游状态](https://security-tracker.debian.org/tracker/CVE-2026-16742)。

只读拉取并预扫描两个候选基底，未修改Dockerfile使用它们：Node24.22.2-trixie-slim仍有48条OS high，另有自带npm语言告警；Nginx1.28-alpine实际为1.28.2，仍有4条critical／77条high。候选与成品内容不同，数字不用于证明“新版本更危险”，只说明直接换标签尚未满足门槛，不能自动当修复。

## 下一步与回退

基础系统进一步裁剪／更新将改变当前运行根文件系统及OS依赖，超出本批应用依赖收敛的具体实现；已完成内部审查并写[差异方案](2026-11-12-runtime-base-remediation-plan.md)，待用户确认，不提前实现或接受风险。

当前代码和镜像是可审查的本地结果。回退只撤销本批准备脚本／构建钩子／Docker改动，使用原alpha镜像；保留A—E安全修复、原始证据与用户改动。回退恢复原发行物和OS风险，不视为安全通过。不删除未知卷或reset工作区。
