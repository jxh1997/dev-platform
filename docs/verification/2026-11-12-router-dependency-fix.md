# DP-002.2-A 路由依赖定向修复

日期：2026-11-12。批准A-003：用户对上一条“Express/router的path-to-regexp8.2.0定向至8.4.2，并进行约定验证”回复“确认”。范围不含其他依赖升级、业务重构或生产发布。

## 变更与边界

- `pnpm-workspace.yaml`增加`router@2.2.0>path-to-regexp: 8.4.2`，只约束router2.2.0的子依赖。父包定向override语义见 [pnpm说明](https://pnpm.io/settings/dependency-resolution#overrides)。Nest／Express／Vben及其他消费者不升级。
- pnpm10.33.4离线生成锁文件，不手改锁。结构比较确认：仅增加该override，router指向8.4.2，并移除失去引用的8.2.0包／快照；其他字段完全一致。实际通过Express→router解析的新进程使用8.4.2。
- 新增`tests/router-dependency.cjs`，在5秒上限独立子进程中验证过多可选组合被拒绝、固定／参数／尾斜线／通配路径行为，以及长输入非匹配场景；不在开发API执行潜在ReDoS输入。
- 未更改业务Controller、DTO、授权、数据库、Web界面或package.json；无新原生依赖。离线安装忽略脚本，没有运行无关postinstall或重新构建Web。

## 验证结果

| 检查 | 实际结果 |
|---|---|
| 旧依赖回归基线 | `node tests/router-dependency.cjs`在router使用8.2.0时失败：未拒绝超过组合上限的模式；保留此否定证据，不把失败当通过 |
| 锁生成 | `pnpm install --lockfile-only --offline --ignore-scripts`成功，未下载新版本；锁语义差异限于上述目标 |
| 冻结安装 | `pnpm install --frozen-lockfile --offline --ignore-scripts`通过，使用本地缓存；不是无缓存网络安装／容器重建验证 |
| 新依赖回归 | `node tests/router-dependency.cjs`通过，使用Express/router实际依赖链，独立子进程受5秒限制 |
| 新测试格式／lint | oxfmt及`oxlint --deny correctness tests/router-dependency.cjs`通过 |
| Server编译 | `pnpm build:server`通过；后续检查复用本次新鲜产物 |
| API契约／边界 | `pnpm exec tsx scripts/api.ts --check`、`pnpm check:boundaries`通过，未修改生成契约 |
| 真库集成 | `pnpm exec tsx tests/integration.ts`全部30组通过；同库夹具串行，含路由404／405及权限／会话／事务回归 |
| 定向E2E | `pnpm test:e2e -- tests/e2e/authorization.spec.ts`通过：1项，47.4秒；普通账号页面／直连API受限 |
| 修复后审计 | 有效JSON，退出1，目标两条公告不再命中；其余153条记录在findings及paths排序后与前次逐字段一致，无新增或改变的公告记录 |

集成故障注入产生的安全500日志属于原有回滚测试，整体退出0；不把未知500当成功。没有重复完整Web构建或全部7项UI回归：本批未改Web，定向授权页面验证承担真实登录／菜单／API准入／会话链路覆盖。

## 审计变化及遗留风险

| metadata | 修复前 | 修复后 |
|---|---:|---:|
| critical | 0 | 0 |
| high | 74 | 73 |
| moderate | 65 | 64 |
| low | 21 | 21 |

消除：[连续可选组问题](https://github.com/advisories/GHSA-j3q9-mxjg-w52f)、[多通配符问题](https://github.com/advisories/GHSA-27v5-c462-wpq7)。公告记录从155降至153，不能把metadata计数当作独立CVE数；其余风险仍见 [审查报告](2026-11-12-dependency-review.md)。前后差异、原始响应摘要、输入摘要和完整被移除条目见 [差分证据](2026-11-12-router-dependency-fix-data.json)，与原始审查快照共同重建本次审计字段结果。

DP-002.2-A完成不等于DP-002全部闭项。Zod、请求库、本地化、模式解析和工具链等须逐项确认方案后处理，不能全量audit fix。

## 运行、发布与回退

测试目标为原有隔离MySQL13307，Web5778／API4311；未修改开发库数据或真实管理员密码。测试结束停止专用服务并保留卷。日常开发服务未主动重启；已加载旧模块的进程需正常重启后加载新依赖，生产须按批准流程重建／部署，不能把锁文件改变称为已发布。

本批回退只撤销定向override，并由pnpm重新生成／安装对应锁依赖；不得reset用户已有文档改动。回到8.2.0会重新引入已知风险，须明确记录，不作为无风险回退。未做镜像重建、生产HTTPS发布、全工作区依赖闭项或其他模块功能验收。
