# 接口与数据规范

版本：V1.0 · 规则前缀：API、DATA。

## 1. 契约的唯一维护来源

API-01：后端请求 DTO、响应 DTO、Controller 元信息是 API 结构的维护源，生成 `docs/api/openapi.json`，再生成 `packages/contracts/src/generated/openapi.ts`。生成顺序固定，两个产物不得人工修改。CI 重新生成比较差异。

业务规则和权限记录在模块说明；数据库实体定义存储结构；它们不能相互替代。跨端基础类型与稳定枚举可手工维护于 contracts，但不再手写第二套同名 API 字段。DTO 可引用公共枚举，contracts 禁止反向 import DTO 或 ORM。

响应 DTO 明确字段白名单，不自动把 Entity 字段全部暴露。OpenAPI 不连接生产库、不执行种子、不开真实队列／外部通知；导出模式使用专门装配，并验证所有应发布路由包含在 schema 中。

## 2. 路由与方法

统一前缀 `/api/v1`；资源路径为复数小写；大版本表示破坏性契约，兼容新增可选字段无需新版本。

| 方法 | 场景 | 默认响应 |
|---|---|---|
| GET | 列表／详情／选项，只读，无业务写副作用 | 200 JSON |
| POST | 创建、部分更新、删除、关系集合替换、导入确认、任务及其他写操作 | 创建 201；同步操作 200＋结果；异步受理 202 |

业务 API 只使用 GET 和 POST，禁止使用 PUT、DELETE、PATCH 等其他方法。GET 不触发业务写入、重置、导入、指令或任务创建。创建使用 `POST /resources`，部分更新使用 `POST /resources/:id/update`，删除使用 `POST /resources/:id/delete`；删除的预期 version 放在 JSON 请求体中。状态变更和关系替换使用明确语义的 POST 子路径；关系集合替换必须在 DTO 中声明全量替换规则，不能与部分更新混淆。不得通过方法覆盖请求头或查询参数模拟其他 HTTP 方法。框架／代理处理的 CORS OPTIONS 预检与 HEAD 协议行为不作为业务接口。

## 3. 响应结构

API-02：JSON 统一封装一次；Service 返回业务结果，HTTP 层统一包装，前端统一解包一次。

```json
{
  "code": 0,
  "message": "成功",
  "data": {"id": "123", "version": 1},
  "requestId": "req-example"
}
```

```json
{
  "code": 409,
  "businessCode": "VERSION_CONFLICT",
  "message": "记录已更新，请重新加载",
  "data": null,
  "requestId": "req-example",
  "fieldErrors": []
}
```

错误 code 固定为对应 HTTP 状态数字，businessCode 为稳定分支依据，message 为可读文案，不能依赖 message 判断行为。fieldErrors 可省略，存在时为 `{field,code,message}` 数组。受限对象不存在与不可见统一 404，避免泄漏存在性；无功能权限仍是 403。

| HTTP | businessCode 示例 | 行为 |
|---|---|---|
| 400 | VALIDATION_FAILED | 字段、区间、类型及未知字段错误 |
| 401 | AUTH_ACCESS_EXPIRED／AUTH_SESSION_REVOKED | 仅前者尝试一次续期 |
| 403 | AUTHZ_DENIED | 不续期 |
| 404 | RESOURCE_NOT_FOUND | 不暴露不可见对象 |
| 409 | VERSION_CONFLICT／RESOURCE_CONFLICT／IDEMPOTENCY_CONFLICT | 显示可执行的解决方式 |
| 413 | PAYLOAD_TOO_LARGE | 明确大小或规模限制 |
| 429 | RATE_LIMITED | 返回适当重试提示，禁止无限重试 |
| 500／503 | INTERNAL_ERROR／DEPENDENCY_UNAVAILABLE | 安全消息＋requestId，不返回 SQL 或堆栈 |

文件、下载流、健康检查使用独立契约，不能把二进制流包进 JSON。依赖不可用不能返回 code=0 的空列表。

## 4. 查询约定

API-03：列表为 `data={list,total,page,pageSize}`；page 从 1 起，默认 pageSize=20、最大 100。超上限拒绝 400，不静默截断；total 是相同过滤与范围下的数量。total 限定在安全整数内，超大规模改用显式游标契约。

默认排序 createdAt DESC、id DESC。排序外部字段映射内部白名单，默认只允许一个业务排序字段＋id 补齐；禁止直接拼接 `sortBy`、SQL 列名或 JSON 查询运算符。稳定字段按资源约定，不对所有表假设 createdAt。

布尔查询只接受字符串 `true`／`false`，明确转换；禁止用 `Boolean('false')`。分页只接受十进制正整数，不允许 NaN、负数、指数或小数。BIGINT 路径／查询 ID 始终作为经过长度与范围检查的字符串，不使用 ParseIntPipe 转为 Number。

时间范围为 `createdAtFrom`／`createdAtTo`，左闭右开；为空表示未筛选，范围倒置拒绝。批量 ID 数默认最多 100，必须去重并重新验证每个 ID。LIKE 明确转义通配符，查询文本长度、可筛选字段、索引和超时在模块设计中定义。选项与统计接口执行同级授权。

## 5. 输入校验与部分更新

API-04：使用 Nest ValidationPipe 的 class DTO 方案，采用 whitelist、forbidNonWhitelisted 和明确的 transform 策略。字段转换显式定义，不全局隐式把字符串变数字。敏感错误不回传原始值。具体配置与适配以锁定 Nest 版本验证。[参考资料 1]

| 输入 | 部分更新语义 |
|---|---|
| 字段未出现 | 不修改 |
| 显式 null | 只允许清空契约声明 nullable 的字段 |
| 空字符串 | 由字段定义允许／拒绝，不自动等于 null |
| 只有 version，没有业务字段 | 400，禁止空更新 |
| 未知字段、createdBy、创建时间等只读字段 | 400 |

不能简单给每个更新字段加 IsOptional 后认为 null 已被拒绝；必须分别测试缺失、null、空串和正常值。字段规范化在明确场景使用，账号／编码可统一 trim 与大小写，密码和条码不擅自变换。

## 6. 数据表示

DATA-01：

| 数据类型 | 数据库 | API／前端 | 限制 |
|---|---|---|---|
| 主键、外键 | BIGINT，实体与驱动以字符串处理 | 十进制字符串，例如 `"123"` | 不用 Number、parseInt 或数学运算处理 ID |
| 业务计数、version | 明确范围整数 | number | 整数且在 JS 安全范围，version≥1 |
| 金额／精确数值 | DECIMAL(p,s) | 字符串，例如 `"12.30"` | 业务明确精度、舍入、上下限；禁止 JS 浮点计算金额 |
| 时刻 | UTC DATETIME(3) | 带 Z 的 ISO 8601 | 驱动／连接统一 UTC，往返验证 |
| 纯日期 | DATE | YYYY-MM-DD | 不通过 Date 自动转时区 |
| 状态 | 字符串／受控值 | 公共枚举 | 状态迁移由代码规则执行，不能靠改字典越权 |
| 布尔 | 实体显式映射 | JSON true／false | 不将 MySQL 0／1 泄漏为接口歧义 |

默认主键由当前实例数据库生成，先由 G0 验证 BIGINT 生成与取回无损。当前 TypeORM／mysql2 的大整数生成映射存在兼容问题：新增后在同事务按唯一业务键回读真实记录，不使用生成映射中的 insertId；无自然唯一键时先定义同连接安全取回方式。依据与实测见 [ADR-002](../architecture/ADR-002-bigint-identity.md)。API 不直接输出 JS bigint，避免 JSON 序列化异常。数据库字符集 utf8mb4；业务编码标准化后使用明确的大小写敏感策略和唯一索引，不能依赖默认排序规则碰巧满足需求。

## 7. 标准表与索引

DATA-02：业务表按实际需要有 id、created_at、updated_at、created_by、updated_by、version；有部门归属才加 owner_dept_id，有逻辑删除才加 deleted_at。不存在通用规则自动替业务声明归属。

表名带领域前缀：sys_* 为核心、demo_* 为样例、行业模块为受控领域前缀。字段长度、默认值、null、单位、状态和索引写入模块设计；不以全字段 nullable 替代设计。

软删除不释放唯一业务编码，原唯一索引不包含 deleted_at；恢复／复用另行定义。关系表有复合唯一约束，关联使用同类型 ID。外键删除策略明确，不级联删除业务历史；多态文件引用由应用层维护一致性。索引按过滤、范围和排序设计，避免为所有字段无差别建索引。

## 8. 事务、并发与幂等

DATA-03：所有受审计业务写入在应用 Service 中编排事务；相同事务 EntityManager 贯穿业务、审计、文件引用和幂等结果。任何错误回滚，不用全局 Repository 在事务外“补写”。[参考资料 2]

DATA-04：更新与删除包含 id＋expectedVersion＋数据范围＋未删除条件，原子递增 version，检查 affectedRows。无匹配时，用受限查询区分可见冲突 409 与不可见／不存在 404；不得返回旧数据假成功。

批量操作整批原子，逐项验证可访问性与 version；稳定顺序加锁。归属变更在同事务更新 authz_epoch；客户端不能修改 createdBy 等系统字段。

API-05：幂等采用 `Idempotency-Key` 请求头，限定长度与字符集。适用于新增、确认导入、任务提交及其他可能重复产生结果的操作；普通 GET 不需要。作用域为实例＋用户＋接口＋键，保存规范化请求摘要、状态和结果。已有同键同摘要返回原结果，同键不同摘要 409；处理中返回确定的处理中反馈，不再执行。

身份与当前权限先检查，再读取历史幂等结果，防止已撤权用户重放旧结果获取敏感数据。数据库事务提交与成功结果保存同事务；客户端超时查询原结果，不立即换键再写。短期幂等记录清理不替代业务唯一键和批次终态。

## 9. Migration 与种子

DATA-05：Entity 为开发模型，Migration 为可执行结构历史。禁止生产 synchronize，开发默认也使用迁移保持可复现。文件采用 TypeORM 可识别时间戳＋模块描述，如 `<timestamp>-demo-create-record.ts`；生成类名／时间戳遵循锁定 TypeORM CLI。

迁移在空库和上一发布结构均验证；MySQL DDL 不能假设完整事务回滚，必须有前滚／恢复策略。已发布或已执行文件不得重写，修正添加新迁移。迁移清单显式登记，禁止同时加载 src 与 dist 导致重复执行。

系统权限注册幂等同步；角色、客户字典、菜单自定义内容不能每次启动被种子覆盖。示例数据只在显式开发／演示环境创建，不自动进入客户生产库。

## 10. 参考资料

1. [NestJS Validation](https://docs.nestjs.com/application/validation)：校验与转换配置；实施时对应固定源码版本。
2. [TypeORM Transactions](https://typeorm.io/docs/transactions/)：事务内使用提供的 EntityManager。
