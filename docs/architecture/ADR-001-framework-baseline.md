# ADR-001：M0 工程与来源基线

状态：已实施。日期：2026-11-10。

## 决策

- 来源固定 vue-vben-admin v5.7.0，commit `63a38dce49ba109f61607994e21ba921d8e970e9`，不升级。保留必要工作区 packages、internal 和工具，前端应用迁至 `apps/admin-web`，私有包名 `@dev-platform/admin-web`。
- 上游要求 Node ^22.18.0 或 ^24.0.0、pnpm >=10，上游 packageManager 指定 10.33.4。项目固定 Node 24.22.2 / pnpm 10.33.4。pnpm catalog 与锁文件保留来源并由包管理器更新；新增服务端依赖采用精确版本。
- 生产构建只构建启用的管理后台和后端。后端 TypeScript 采用 Node16 模块解析、CommonJS 输出到根 dist，dist/package.json 明确 commonjs，避免 ESM 包与装饰器运行行为差异。开发 API 运行编译产物；数据库 CLI 由 tsx 运行，根 tsconfig 显式启用传统装饰器。
- M0 实现单实例认证和 ALL / SELF 操作范围。授权记录直接按用户维护，仅管理员初始化命令登记初始授权；本阶段不提供用户／角色／部门管理接口。完整 M1 关系模型在后续迁移中建设。
- 台账在 M0 使用创建人范围，不接收归属部门或附件；部门、转移、文件、导入导出未装配，不展示占位接口。相关能力与完整模块规范的差异见模块说明。
- 业务 HTTP 仅 GET / POST；应用请求层阻断其他方法，后端中间件阻断其他业务方法及方法覆盖。CORS OPTIONS / HEAD 仅作为协议行为。

## 最小上游补丁

`packages/stores/src/modules/access.ts` 移除整个 persist 配置，防止 Access / Refresh Token、权限和锁屏密码进入 localStorage。这是满足仓库会话安全约束的必要安全补丁，不含业务条件；其余适配位于 apps/admin-web。未升级来源版本。

前端使用现有 RequestClient、布局、Pinia、动态路由生成、认证表单及 Element Plus。刷新采用标签内 single-flight 和浏览器 Web Locks；不支持 Web Locks 的浏览器在竞争时按服务端严格轮换策略安全地重新登录。Access 过期只自动重放 GET，POST 由用户确认后重试。

## 运行约束

- 登录限流在单进程内存中，部署只启用一个 Server；代理到 Server 的连接来源共享 IP 限额，账号另行限流。扩容前需实现可信代理来源及共享限流。
- MySQL 结构只通过显式迁移改变，应用不运行 synchronize 或自动迁移。部署由 migrate 一次性容器先执行。
- 本地开发随机配置由 env:init 创建；管理员使用单次环境变量初始化，无公开初始化路由和默认密码，首次登录强制改密。
- Docker 站点只绑定宿主回环端口，生产由外部 HTTPS 反向代理接入；Secure Cookie 要求 APP_ORIGIN 为真实 HTTPS 来源。

## 未覆盖范围

Worker、Valkey、文件存储、恢复演练、完整 RBAC、部门树、生成器及正式版验收不在 M0 框架实现内。不得将本次构建通过称为软件 v1.0.0 或全部 G0 验收通过。

认证与台账分别由 AuthModule、RecordsModule 声明，根 AppModule 只装配模块、健康端点和全局 Guard。数据库生命周期由 Server composition 中的全局 DatabaseModule 提供，database 包保持不依赖 Nest。大整数主键回读决策见 ADR-002。
