# DP-002 剩余 glibc 风险状态复核

日期：2026-11-13；范围：只读核对厂商状态及当前运行层实现。未重新扫描、构建或运行测试。

## 结论与证据

- [CVE-2026-100290](https://security-tracker.debian.org/tracker/CVE-2026-100290)：Debian bookworm 的 glibc 2.36-9+deb12u14 仍标记 vulnerable；fixed version 为 unfixed。涉及 regcomp／regexec 在内存分配失败时的释放后使用／重复释放。页面对 trixie 的 no-dsa／Minor issue 注记不能直接作为本项目 bookworm 风险接受依据。
- [CVE-2026-115819](https://security-tracker.debian.org/tracker/CVE-2026-115819)：同一 bookworm 版本仍标记 vulnerable，fixed version 为 unfixed。涉及宽字符 scanf 将转换结果写入窄字符数组时多写一个空字节。
- 两条页面中的 trixie 与 sid 也仍为 vulnerable；当前证据不支持通过切换这些 Debian 分支闭项。
- 已核对 deployment/Dockerfile.server 和 scripts/prepare-node-runtime.mjs：运行层仍从 Node24.22.2 bookworm 来源提取实际动态库；scratch 层不消除 glibc 风险。未重新读取镜像包清单，当前镜像版本证据沿用 2026-11-12 报告。
- 首次浏览工具未能读取Sourceware公告与Debian bug详情；随后通过HTTPS直接取得两份Sourceware原始公告。CVE-2026-100290为CVSS 3.1的3.7分（低），CVE-2026-115819为4.8分（中）；原始公告均未列Fix-Commit字段，不能据此断言上游不存在补丁。来源URL、公告字段和SHA-256见[评级证据](2026-11-13-glibc-advisory-data.json)。扫描中的unknown原始记录保留，不改写成已修复。

DP-002、DP-002.3、DP-002.3-b 保持未完成；昨日扫描等级与功能结果不记为今日复测。

## 后续处置

1. 修复恢复推进时再继续只读核查：收集原始公告／修复提交，盘点实际发行物中的 Node 与原生扩展，分析上述函数的调用及外部输入可达性。仅无导入符号或未复现不能证明不受影响。
2. 如厂商提供修复包，提交固定来源版本、镜像变化及定向验证方案；如需自行回补，先提交补丁来源、构建方式、ABI 兼容与恢复方案，再按项目大改动规则确认实施。
3. 在明确修复或充分不受影响证据形成前，保留发布阻断。不新增忽略规则或将 unknown 自动降级。
4. 用户已明确要求暂缓这两条glibc风险修复，优先DP-003 → DP-004 → 部门与数据范围。暂缓不等于风险接受、修复完成或发布授权；DP-003已完成本地验证，证据见[报告](2026-11-13-dp003-test-groups.md)。
