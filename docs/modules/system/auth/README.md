# M0 认证与会话

使用 bcryptjs cost=12 保存密码哈希；短期 JWT Access 为 HS256、15 分钟，固定 issuer（INSTANCE_ID）和 audience。Access 只存前端内存；Refresh 为高熵随机值，通过 HttpOnly / SameSite=Strict Cookie 传输，生产增加 Secure，Path 为 /api/v1/auth；服务端仅保存 SHA-256 哈希，绝对有效期 7 天。

每次请求检查签名、会话、用户状态及安全版本，并读取当前操作授权。默认保护；公开端点只有健康、登录、刷新及退出。退出仍校验 Origin，只接受有效签名标识或匹配哈希的刷新 Cookie 撤销当前会话；重复退出幂等成功，不授予业务权限。业务功能权限缺失 403，对象范围不可见 404。GET me、permissions、menus 是身份端点，首次强制改密时仅返回有限信息及空权限／菜单。

登录与刷新检查 Origin，账号和来源限流。刷新按会话行锁原子轮换，旧值复用会提交撤销，然后返回 401。改密在同事务更新安全版本、撤销所有旧会话和写审计，要求重新登录。管理员初始化锁定单一 bootstrap 行，拒绝重复初始化，没有公开默认密码。

接口：POST /auth/login、/auth/refresh、/auth/logout、/auth/password；GET /auth/me、/auth/permissions、/auth/menus。所有业务方法仅 GET / POST。DTO 与生成 OpenAPI 为字段定义源。

范围限制：M0 只有首次管理员初始化命令和直接用户操作授权，没有公开注册、密码找回、用户／角色／部门管理页面。单实例限流与最小授权模型不能视作完整 M1 RBAC。

密码规则：初始化管理员及设置新密码均为 6–12 字符，不要求额外字符组合，不自动 trim。登录和当前密码验证兼容历史长密码（最多 72 字节），避免规则调整锁定已有账号；下一次修改必须采用新规则。JWT、数据库及其他机器密钥强度不受此规则影响。
