# 认证、授权与账号管理

## 范围与规则

本模块交付登录、用户、角色、菜单、接口权限及会话闭环。当前数据范围为 ALL（全部）／SELF（本人），按实际授予该操作的有效角色取并集；一个角色的全量查看不会扩大另一个角色的本人修改。部门树、本部门、下级和指定部门范围尚未实现，不对外展示。

认证沿用 bcryptjs cost=12、HS256 JWT Access（15 分钟）、HttpOnly／SameSite=Strict Refresh Cookie（绝对 7 天，生产 Secure，Path=/api/v1/auth）。Access 仅存内存，Refresh 仅存 SHA-256 哈希。每次请求读取用户启用状态、安全版本、会话和当前有效角色／权限，不相信 JWT 或客户端提供的角色快照。首次登录及重置密码后强制改密；本人改密后撤销全部旧会话并重新登录。

账号 trim＋小写标准化后唯一，禁止修改账号，以停用代替日常删除，永久不复用。新密码、初始化及重置密码为 6–12 字符，不自动 trim；登录和当前密码兼容历史长密码（最多 72 UTF-8 字节）。密码、哈希、Cookie 和 Token 不进入响应及审计差异。

## 登录滑块校验

登录页复用固定 v5.7.0 认证分栏布局与原有插画，保留三种布局、主题、偏好及记住账号。滑块支持鼠标／触摸拖至末端和键盘方向键；加载、验证中、通过、失败、过期分别反馈。

先 `POST /auth/captcha/challenge` 创建 120 秒挑战，设置 HttpOnly／SameSite=Strict／生产 Secure 的 `dp_captcha` Cookie（Path=/api/v1/auth）。`POST /auth/captcha/verify` 接收 challengeId 与 0–100 整数 progress，仅完整进度 100 且挑战创建至少 400ms 后可通过；一次使用挑战，返回 60 秒 captchaToken。登录 DTO 必须携带 captchaToken，登录接口先同步消费绑定当前浏览器的凭证，再校验密码；密码错误也消耗凭证。缺失、伪造、跨浏览器、过期或重放拒绝，不接受客户端 verified 标记。

所有步骤校验 Origin，响应 no-store，挑战／凭证只存单进程内存且凭证存哈希；总量上限 2000，到期清理，重启失效。滑块接口按实际连接来源独立限流 120 次／分钟，登录现有来源／账号限流保持不变。当前是单进程部署，扩容前须将验证码状态和限流迁移到共享原子存储。

这是参考页的简单拖动交互门槛，自动化可以模拟完整流程，不宣称能识别真人；需要对抗机器人时接入专业验证服务。客户端只在组件内存保存短期凭证，不保存到 localStorage；验证失败、过期、密码失败、刷新或离开登录页后返回均需重新验证；认证布局缓存组件时按激活／停用生命周期清理重建。无数据库迁移，不变更角色／接口权限规则。

## 授权边界

- 操作权限由 `packages/database/src/authorization-registry.ts` 的发布注册表定义，经 `pnpm db:seed` 同步；菜单不能创造 API 权限。普通角色仅可分配已注册、启用的操作。
- `super-admin` 是受保护系统角色，资格来自服务端关系；后台不能创建另一种超级管理员角色或重定义其权限。超级管理员可管理用户、角色、菜单、角色分配和操作授权。
- 普通管理员仅能按已授予的操作及 ALL／SELF 范围管理非管理员账号，不能管理包含有效系统权限的账号、分配角色或管理角色／菜单／权限注册表。创建用户需要 ALL 范围，新账号不带角色。
- 敏感写入先锁 `sys_security_state.id=1`，重读操作者状态与有效权限，校验目标和 version。所有相关变更提交后必须至少保留一个有效超级管理员；并发禁用、解除角色、停用系统角色同样受约束。
- 默认保护全部业务 API；缺功能权限返回 403；对象不在操作范围内统一 404；版本过期返回 409。页面和按钮控制仅改善体验，不能代替后端校验。
- 业务台账的 SELF 按 created_by 判断。账号管理的 SELF 按目标用户 ID 判断，并继续受管理员账号保护规则约束。会话归属按 user_id，不允许猜 ID 撤销他人会话。

## 数据与事务

| 表 | 内容 |
|---|---|
| sys_user | 账号、姓名、启用／强制改密、安全版本和乐观锁 version；哈希默认不查询 |
| sys_role | 唯一编码、名称、启用、受保护超级管理员标识、version |
| sys_permission | 代码注册的操作权限；后台只读，不随菜单创建 |
| sys_user_role | 用户—角色，多角色关系 |
| sys_role_permission | 角色—操作—ALL／SELF，各操作独立范围 |
| sys_menu | 编码、父目录、路由名、路径、标题、图标、类型、组件与进入权限、排序、显示／启用、version |
| sys_role_menu | 角色—导航关系，与操作权限分离 |
| sys_security_state | 固定安全锁与 BIGINT 字符串 authz_epoch |
| sys_session | 会话 UUID、用户、安全版本、刷新哈希、代次、绝对到期、撤销时间及原因 |
| sys_audit／sys_idempotency | 同事务成功审计与新增请求的幂等结果 |

账号、角色、菜单更新以 id＋version 条件执行并检查受影响行数。用户角色／角色权限与导航为显式全量替换，使用所属用户／角色的 version。安全锁使当前事务中的可信范围判断与写入保持串行；普通账号的范围不由客户端字段拼接。

创建用户／角色／菜单必须携带 16–100 位 `Idempotency-Key`（字母、数字、下划线或横线）；按用户＋操作隔离，同事务存储结果，规范化请求采用服务端 HMAC-SHA256 摘要，密码不存入幂等记录。同键同内容返回原结果，异内容 409；重放前重新验证当前授权。前端每次打开新增表单生成一个键，失败后重试沿用原键。

安全变更、authz_epoch 递增和白名单审计前后差异同事务提交，审计失败全部回滚。本人／管理会话撤销只更改目标用户拥有的会话并写审计；禁用、重置与本人改密同时撤销该用户会话并标明原因。CLI 权限同步使用显式系统主体 0，不能用于公网认证。

## 菜单与页面

类型为目录、页面、按钮和 HTTPS 外链。页面组件、固定路径及进入权限必须与发布白名单一致；目录最多 5 层，移动同时校验后代深度，拒绝自身为父、循环、重复路由名和路径。外链只接受无内嵌凭据的 HTTPS URL，拒绝脚本协议；非页面不能指定任意组件。存在子菜单或角色引用时禁止删除。

页面导航须同时满足：角色分配该菜单、该菜单及父级启用、具备页面声明的进入权限、父目录已分配。隐藏保留路由，仅隐藏导航；停用移除页面入口，不隐式撤销操作权限。按钮不生成路由，其可见性仍由操作权限决定。更改导航后重新加载页面获取新菜单。

`/auth/me` 返回真实角色、超级管理员标识及可访问首页；没有业务页面时进入 `/account/sessions`。首次强制改密时返回空菜单／权限，仅开放必要身份、改密和退出。普通用户始终可以在改密后管理本人会话，最近 100 个会话不返回刷新哈希。

## API

统一前缀 `/api/v1`，JSON 由全局层封装。字段以 DTO 和生成的 [OpenAPI](../../../api/openapi.json) 为准，BIGINT ID 为字符串。所有业务方法仅 GET／POST。

| 方法与路径 | 操作权限／条件 |
|---|---|
| POST /auth/captcha/challenge、/captcha/verify | 显式公开，Origin 与独立来源限流 |
| POST /auth/login、/refresh、/logout | 显式公开，Cookie 操作校验 Origin；登录与刷新限流 |
| POST /auth/password | 本人身份，校验当前密码 |
| GET /auth/me、/permissions、/menus | 本人身份与必要信息 |
| GET /auth/sessions；POST /auth/sessions/revoke | 本人会话；首次改密前不能撤销其他会话 |
| GET /system/users；GET /system/users/:id | system:user:list／read，独立范围 |
| POST /system/users；POST /system/users/:id/update | system:user:create／update，独立范围与管理员保护 |
| POST /system/users/:id/assign-role | system:user:assign-role＋超级管理员 |
| POST /system/users/:id/reset-password | system:user:reset-password，目标范围与管理员保护 |
| GET /system/users/:id/sessions；POST /system/users/:id/revoke-session | system:user:sessions／revoke-session，独立范围与管理员保护 |
| GET /system/roles；POST /system/roles | system:role:list／create＋超级管理员 |
| POST /system/roles/:id/update、/delete、/grants | system:role:update／delete／grant＋超级管理员 |
| GET /system/menus；POST /system/menus | system:menu:list／create＋超级管理员 |
| POST /system/menus/:id/update、/delete | system:menu:update／delete＋超级管理员 |
| GET /system/permissions；GET /system/page-components | system:permission:list／system:menu:list＋超级管理员 |

## 迁移、初始化与验证

新增迁移依次建立授权结构、规范化历史账号和补充菜单图标，不修改 M0 已执行文件。旧 sys_user_permission 保留为升级证据；每位旧账号获得独立 legacy-<userId> 兼容角色，保留原 ALL／SELF 操作，不再从旧表认证。只有 `system:admin:init` 审计确认的用户获超级管理员角色，普通全量业务权限不会被提升。未知旧权限／范围或账号标准化冲突必须人工核对，不静默丢弃或合并身份。

显式执行 `pnpm db:migration:run` 后运行 `pnpm db:seed` 同步已发布权限；不会覆盖客户角色和导航。新实例再执行一次 `pnpm admin:init`，管理员无公开默认密码，重复初始化拒绝。已有实例升级不重复初始化管理员。应用发现待执行迁移时拒绝启动。 授权迁移的 MySQL 部分提交由独立恢复适配按原迁移名校验后续跑，CLI 同连接命名锁阻止并发；结构、页面映射或已有范围不一致时停止。原迁移文件不改写，不能手工补成功记录。恢复证据见 [本地恢复报告](../../../verification/2026-11-11-local-recovery-and-restart.md)。

真实 MySQL 验证位于 `tests/integration.ts`；M0 升级演练位于 `tests/authorization-migration.ts`（独立新建 13308 测试实例，只接受空实例，不重置数据）。浏览器验证位于 `tests/e2e/authorization.spec.ts`，覆盖管理员配置角色／账号／菜单、业务用户强制改密与权限差异、直接 API 拒绝及本人会话。结果与已知边界见 [验证报告](../../../verification/2026-11-11-auth-authorization.md)。
