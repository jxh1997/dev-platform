# 认证授权闭环实施计划

目标：登录、用户、角色、菜单、接口权限与会话形成真实链路，不同账号及直接 API 调用均受授权限制。

架构：保留现有 AuthGuard、JWT／Cookie 与事务审计；新增角色—操作—范围和角色—菜单关联。每次认证读取当前有效角色与已注册权限，按操作合并 ALL／SELF；菜单分配与接口授权分离。敏感管理事务先锁 sys_security_state 固定行，再重新校验操作者、目标和 version，最后递增 authz_epoch 并写审计。

技术栈：既有 Vue 3／TS／Element Plus、NestJS、TypeORM、MySQL；不新增运行依赖。

## 实施顺序与验收

1. 扩充 `docs/modules/system/auth/README.md`：字段、稳定权限、路由、超级管理员边界及本次范围；部门树及部门范围不在本次交付。
2. `packages/database/src/entities/system/authorization.entity.ts`、新 Migration、注册清单和 CLI：新建角色、权限、菜单、关联、安全状态；以独立兼容角色迁移旧直接授权，保留原表但认证不再读取。仅经管理员初始化审计确认的账号获得超级管理员角色。空库与 M0 升级均验证。
3. `packages/backend-modules/src/auth/`：实时解析角色、逐操作范围、数据库菜单、正确 homePath；本人会话查看与撤销，强制改密期间不开放其他会话管理。
4. `packages/backend-modules/src/system/`：分页用户、角色和菜单列表；创建、版本更新、禁用／删除、角色及权限／菜单集合替换、重置密码和管理会话。所有写入字段白名单、事务审计、version 和安全锁；普通管理员不能管理高权限账号或进行授权。
5. `apps/admin-web/src/views/system/`：用户、角色、菜单及本人会话页面。列表负责查询／分页，编辑组件负责表单和保存；使用生成契约、受控组件选择和显式操作权限。不添加无意义统计卡。
6. `tests/integration.ts` 与 `tests/e2e/`：真实 MySQL 验证多角色逐操作合并、菜单/API 分离、无权直接调用、篡改字段、授权即时生效、禁用／重置／撤销、最后管理员并发、审计回滚、迁移保留原权限；浏览器验证真实管理链路与多账号按钮／页面访问。
7. 生成契约，执行 `pnpm lint`、`pnpm typecheck`、`pnpm check:boundaries`、`pnpm api:check`、`pnpm build`、`pnpm test:integration`、`pnpm test:e2e`。测试仅连接受保护本机专用库，不修改用户开发数据。

## 风险与交付边界

- 已执行 M0 Migration 不改写；新迁移不自动删除旧授权表，不把所有全量业务账号提升为管理员。
- 超级管理员资格由受保护的系统角色表示，普通请求不能通过字段或权限码伪造。
- 菜单停用影响页面入口，不能当作撤销接口权限；未知组件和危险外链拒绝。
- 本次不表示完整 M1（部门树／部门范围）或正式版已验收；不发布、不推送。
