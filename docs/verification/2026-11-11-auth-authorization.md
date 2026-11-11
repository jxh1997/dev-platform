# 认证授权闭环验证

日期：2026-11-11。软件版本：0.1.0-alpha.1。范围为登录、用户、角色、菜单、接口权限及会话；未发布、未推送，不代表完整 M1 或软件正式版验收。

## 实现与权限边界

- 用户列表、创建、版本编辑、禁用、角色分配、密码重置、会话查看与撤销；首次改密和原有刷新／退出链路继续使用。
- 多角色按操作合并 ALL／SELF；菜单分配与接口权限分离；服务端默认保护，注册权限只读，未知权限不能通过菜单创造。
- 只有超级管理员可分配角色、操作权限及管理角色／菜单；普通管理员不能管理管理员账号。固定安全状态锁串行保护最后一个有效超级管理员。
- 更新包含预期 version，账号范围进入最终写入条件；安全变更、授权代次及白名单审计同事务。新增用户／角色／菜单支持幂等，审计及响应不含密码或哈希。
- 新增授权结构、账号规范化与菜单图标三项迁移。旧直接授权映射为独立兼容角色，运行时不再读取旧授权表；仅初始化审计确认的用户提升为超级管理员。M0 原迁移未改写。

详细字段、API 与规则见 [模块说明](../modules/system/auth/README.md)。实施范围与顺序见 [计划](../plans/2026-11-11-auth-authorization.md)。

## 环境与执行结果

本机 macOS arm64，显式使用 Node 24.22.2（`~/.nvm/versions/node/v24.22.2/bin`）和 pnpm 10.33.4。真实数据库为 Colima Docker 中的固定 `mysql:8.4.7`；集成测试使用本机回环 13307 的专用 dev_platform_test 数据库、devplatform_test 账号与 dev-platform-test 实例标识；M0 升级演练使用另一新建实例的 13308。浏览器为 Playwright Chromium，Web 5778、API 4311，避免占用原有 5777 开发服务。

| 实际执行 | 结果 |
|---|---|
| `pnpm lint` | 通过；新 system 页面和请求文件已纳入根脚本 |
| `pnpm typecheck` | 前后端通过 |
| `pnpm check:boundaries` | 通过，业务方法及依赖边界静态检查 |
| `pnpm api:generate`、`pnpm api:check` | 源 DTO／Controller 生成契约，重新比较一致；新增操作声明必需幂等请求头 |
| `pnpm build` | Server 与启用 Web 工作区构建通过 |
| `pnpm build:web` | 最后按权限调整台账空文案后重新构建通过 |
| `pnpm test:integration` | 真实 MySQL 28 组通过 |
| `pnpm exec tsx tests/authorization-migration.ts` | 独立新建实例中 M0 → 当前迁移通过，历史权限、SELF 范围与初始化管理员身份保留，普通账号未提升 |
| `E2E_WEB_PORT=5778 pnpm test:e2e` | 3 条真实浏览器流程通过，含原台账、改密回归及新增授权闭环 |
| `git diff --check` | 通过 |

真实集成覆盖新增幂等、用户名标准化与唯一性、未知／只读字段、所有 system 路由的未登录 401 与业务账号直连 403、多角色逐操作范围、角色停用／用户角色替换／权限变更后的原 Access 即时受限、导航与 API 分离、普通管理员越级拒绝、未知页面／危险外链／循环／深度／引用删除、版本并发、会话归属与撤销、禁用和重置的 Access／Refresh 失效、强制改密、审计故障回滚及最后两名管理员并发禁用保护。审计故障注入的预期 500 代表回滚分支，不是业务成功。

浏览器流程：管理员登录 → 新建角色 → 独立选择导航与台账查看权限 → 新建用户与分配角色 → 新建目录菜单 → 另一浏览器上下文首次登录及强制改密 → 仅查看台账且无新增按钮 → 直接调用用户列表与台账新增被拒绝 → 本人会话页面撤销另一有效会话，该会话 Access 随即失效。截图使用随机虚构用户；不包含真实凭据。

## UI 与安全审查

页面复用 Page、Element Plus 表格／表单／弹窗／分页、现有请求与动态路由能力，采用连续列表、单一主操作和主题 token；编辑草稿由独立组件持有，列表请求用序号避免旧结果覆盖，离开路由／浏览器有未保存提醒。900px 下用户操作列固定在右侧并换行，桌面深浅主题已实际打开检查。

审查修复：显式定义可选布尔 prop 默认值，保证本人会话可以撤销；选择器通过键盘及可见控件交互验证；截图等待加载及消息结束；保留失败输入和原 version，不自动覆盖冲突；没有新增权限时台账空状态不再提示新增。

Vue 职责、响应式、props／emits、监听清理和输入白名单已按本次文件范围审查。外部 UI 审查资料为 [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)，读取日期 2026-11-11；按本项目固定 Vue／Element Plus 规则取适用项，未机械引入 React 写法或虚拟列表。安全审查关注服务端权限、CSRF／JWT 既有规则、密码及审计白名单、事务与并发，不据此宣称完整安全认证。

| 截图 | 内容 |
|---|---|
| [用户管理](auth-authorization/users.png) | 桌面暗色列表 |
| [浅色用户管理](auth-authorization/users-light.png) | 浅色主题 |
| [窄窗口](auth-authorization/users-narrow.png) | 900px 用户操作区 |
| [角色管理](auth-authorization/roles.png) | 普通角色与受保护系统角色 |
| [菜单管理](auth-authorization/menus.png) | 已发布页面与新目录 |
| [业务账号](auth-authorization/member.png) | 仅有查看权限的台账 |
| [本人会话](auth-authorization/sessions.png) | 其他会话已撤销、当前会话可撤销 |

## 演练发现与复现边界

首次授权迁移真库执行发现旧权限编码与新注册表的排序规则冲突；修正的是当时尚未成功执行的新迁移，随后在另一干净测试卷验证。账号规范化预检也修正了 ONLY_FULL_GROUP_BY 下的分组表达式。未改写成功执行的迁移，未删除失败迁移记录或清空已有数据来伪造成功。

本次健康测试实例的 Compose 项目为 `dev-platform-authz-validation`（13307），升级演练项目为 `dev-platform-authz-migration-v2`（13308）。早期失败演练实例已停止，卷保留用于核查。继续本机集成测试可直接使用健康 13307 实例；需启动时使用相同项目名：

```bash
docker compose -p dev-platform-authz-validation --env-file .env.test -f deployment/compose.test.yaml up -d --wait
pnpm test:integration
E2E_WEB_PORT=5778 pnpm test:e2e
```

迁移脚本刻意要求新建空实例，重复运行会拒绝已有 sys_user，不提供 reset。再次从 M0 演练时须明确使用新的隔离卷并释放演练端口，不把脚本指向开发库或客户库。

## 未执行与接手步骤

- 该轮验证时未对现有开发／客户库执行迁移，未发布、推送或重新部署现有开发服务；后续本地开发库恢复与统一重启见 [本地恢复报告](2026-11-11-local-recovery-and-restart.md)。原有 5777 服务不代表本次功能已装配。启用前先识别真实数据库目标，备份后显式执行 `pnpm db:migration:run`、`pnpm db:seed` 并重启 API／Web。新实例再执行一次 `pnpm admin:init`；已有管理员不重复初始化。
- 本次没有新增依赖；未重新执行全量依赖审计、生产容器／HTTPS 验收、备份恢复或性能压测。既有 [依赖审计剩余项](dependency-audit.md) 继续有效。
- 部门树与部门范围、文件、导入导出和任务不在本次交付，不应把本报告作为完整 M1／P0／正式版验收结果。
