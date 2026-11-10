# 新模块标准开发指南：设备台账

版本：V1.0 · 示例模块：demo.records · 资源：demo.record。

本指南把工程规则落到一个完整模块。示例是开发设计，公共 Provider 名称按实际代码替换，不是一套已编译运行的模块源码。首个模块手工实现，后续生成器以该模式为基准。

## 1. 范围与业务规则

设备台账验证后台列表、详情、新增、编辑、软删除、部门归属、附件和审计。导入导出是后续能力包，未启用前不创建假按钮或直接同步导出接口。

| 功能编号 | 功能 | 约束 |
|---|---|---|
| REC-001 | 列表与详情 | 操作范围、分页与稳定排序；详情不可见统一 404 |
| REC-002 | 新增 | 编码唯一且不复用，创建人由服务端填写 |
| REC-003 | 编辑 | 必须携带 version；普通编辑不修改归属部门 |
| REC-004 | 删除 | 软删除、version 校验；编码继续占用 |
| REC-005 | 转移归属 | 独立操作，检查当前及目标范围，递增授权代次 |
| REC-006 | 附件 | 临时 fileId 校验，业务引用同事务；受业务权限控制 |
| REC-007 | 导入导出 | 只有任务／导入公共能力通过验证后才装配 |

本模块状态为 enabled／disabled，只表示台账记录状态，不控制真实设备联网、指令或使用权限。避免把演示字段误当作物联网业务模型。

## 2. 字段与唯一规则

| API 字段 | DB 列 | 类型 | 输入／规则 |
|---|---|---|---|
| id | id | BIGINT→string | 服务端生成，不接受用户创建 |
| code | code | VARCHAR(64) | 新增必填，示例只接受大写字母、数字、-、_，2—64 位；创建后不可改 |
| name | name | VARCHAR(100) | 必填，trim 后 1—100 字符 |
| status | status | VARCHAR(16) | enabled／disabled，新增默认 enabled |
| ownerDeptId | owner_dept_id | BIGINT→string | 新增及独立转移接口必填，普通 部分更新 不接受 |
| remark | remark | VARCHAR(500) NULL | 可空；null 清空，空串规范化为 null |
| fileIds | 无直接数组列 | string[] | 临时／既有附件集合，最多 5 个，关系在 sys_file_link |
| createdBy／updatedBy | created_by／updated_by | BIGINT→string | 服务端主体 |
| version | version | INT | 新增 1，每次修改／转移／软删＋1 |
| createdAt／updatedAt | created_at／updated_at | DATETIME(3) | UTC |
| deletedAt | deleted_at | DATETIME(3) NULL | 不给普通前端修改 |

code 使用明确大小写敏感的比较／唯一策略；唯一索引只含 code，不含 deleted_at。查询索引至少评估 `(owner_dept_id,deleted_at,created_at,id)` 与 `(created_by,deleted_at,created_at,id)`；最终按 EXPLAIN 和实际范围查询校准，不声称这两个索引覆盖所有搜索。

附件 fileIds 在新增可省略；编辑未传不改，传 [] 清空关联，传非空数组替换当前集合；null 拒绝。替换前验证每个文件可关联，禁止把他人临时文件作为自己的附件。引用变化与业务更新同事务，不立即物理删文件。

## 3. 操作权限与范围

| 权限码 | 数据范围适用 | 说明 |
|---|---|---|
| demo:record:list | 是 | 列表、受限选项 |
| demo:record:read | 是 | 详情、业务附件读取 |
| demo:record:create | 是，作为目标归属可分配范围 | 创建人始终本人；本人模式的目标部门默认限本人部门，无部门则拒绝 |
| demo:record:update | 是 | 常规字段与附件修改 |
| demo:record:delete | 是 | 软删除 |
| demo:record:transfer | 是 | 来源可管理；目标部门满足该操作可分配范围 |
| demo:record:import | 是 | 仅新增；目标归属与创建规则相同 |
| demo:record:export | 是 | 独立导出范围，不沿用 list 范围 |

列表权限与 read 权限分开，不自动默认前者包含后者；页面进入要求 list，详情操作要求 read。角色可被种子明确同时授权，后端不能靠隐含继承实现。

本人范围：created_by＝当前用户；本部门范围：owner_dept_id＝用户部门；下级和指定部门按当前树／关联解析。角色 A 全量查看、角色 B 本人修改，只能修改本人记录。

创建和转移的“目标范围”不是对尚不存在对象应用 WHERE。策略需要单独验证目标部门集合；ALL 可指定有效部门，部门／下级／指定部门模式从对应集合选择，SELF 默认只本人有效部门。模块不允许无归属记录，新建无部门用户直接明确拒绝。

## 4. 接口表

统一前缀 `/api/v1/demo/records`。

| 方法与后缀 | 请求重点 | 结果 | 权限 |
|---|---|---|---|
| GET / | page、pageSize、name、status、createdAtFrom／To、sortBy、sortOrder | list／total／page／pageSize | list |
| GET /:id | 字符串 ID | RecordResponse | read |
| POST / | CreateRecordDto＋Idempotency-Key | 201，RecordResponse | create |
| POST /:id/update | UpdateRecordDto，必需 version | 200，RecordResponse | update |
| POST /:id/delete | JSON 请求体中的正整数 version | 200，id／version／deleted=true | delete |
| POST /:id/transfers | ownerDeptId、version、Idempotency-Key | 200，id／ownerDeptId／version | transfer |
| POST /import-batches | fileId、templateVersion | 202，batchId／state | import |
| POST /import-batches/:id/confirm | Idempotency-Key | 200，batchId／successCount／state | import |
| POST /export-tasks | 白名单过滤与字段配置、Idempotency-Key | 202，taskId／status | export |

后两类接口仅在对应公共能力启用后提供；导出查询／下载使用 `/api/v1/tasks/:id` 与其 file 端点。列表 sortBy 只允许 createdAt／name，默认 createdAt DESC＋id DESC。日期查询只接受 UTC 时刻；模糊名称最长 100 字符。

## 5. JSON 示例

新增请求：

```json
{
  "code": "DEV-0001",
  "name": "测试设备",
  "status": "enabled",
  "ownerDeptId": "20",
  "remark": null,
  "fileIds": []
}
```

更新请求：

```json
{"name":"更新后的设备","remark":null,"version":3}
```

成功响应：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "id": "123",
    "code": "DEV-0001",
    "name": "更新后的设备",
    "status": "enabled",
    "ownerDeptId": "20",
    "remark": null,
    "fileIds": [],
    "createdBy": "10",
    "updatedBy": "10",
    "version": 4,
    "createdAt": "2026-11-10T06:00:00.000Z",
    "updatedAt": "2026-11-10T06:10:00.000Z"
  },
  "requestId": "req-example"
}
```

样例中的 name、日期和 ID 仅用于契约说明，不是客户真实记录。fileIds 为当前有效关联，不暴露物理路径。附件元数据／下载 URL 通过受控文件接口取得。

## 6. 实际需要修改的文件

| 工作 | 位置 | 修改方式 |
|---|---|---|
| 模块说明 | `docs/modules/demo/records/README.md` | 从模板创建并填完规则 |
| Entity | `packages/database/src/entities/demo/record.entity.ts` | 映射上述字段，声明唯一与查询索引 |
| 注册 | `packages/database/src/entity-registry.ts` | 显式增加 Entity |
| Migration | `packages/database/src/migrations/` | 生成、核查、真库执行 |
| 后端 | `packages/backend-modules/src/demo/records/` | Module、Controller、Service、Query、DTO、权限与测试 |
| 装配 | `apps/server/src/composition/` | 注册 HTTP 模块与权限清单 |
| Worker | `apps/worker/src/composition/` | 仅启用导出时注册对应处理器 |
| 契约 | `docs/api/openapi.json`、`packages/contracts/src/generated/openapi.ts` | 工具生成，不手改 |
| 前端 | `apps/admin-web/src/views/demo/records/`、`src/api/demo/records.ts` | 列表、schema、表单、API |
| 导航与授权初始化 | 当前项目菜单／权限种子 | 幂等登记，不覆盖客户已有授权 |

不改认证核心、不复制文件服务、不在 @vben/* 增加业务条件。涉及公共能力缺口时单独明确新增接口及受影响调用者。

## 7. 开发顺序与验收点

1. **规则完成**：字段、权限、目标范围、状态、错误、事务和验收填写完整；没有未知的归属口径。
2. **数据完成**：Entity 与 Migration 在空库／既有基线可运行，BIGINT、UTC、唯一约束通过。
3. **读链路完成**：列表与 total 同范围，详情不可见统一 404，字段不越权。
4. **写链路完成**：新增幂等、编辑与删除版本条件、附件同事务和成功审计。
5. **契约完成**：OpenAPI 导出、生成类型、前端引用通过，字段不手工同步。
6. **页面完成**：真实后端联调，加载、空、失败、409 和结果待确认状态可观察。
7. **可选能力完成**：启用导入导出才执行解析、队列和撤权专项验证。
8. **交付完成**：检查报告列出实际通过范围，清理临时 Mock，版本和迁移清单一致。

## 8. 更新用例的事务设计

以下是算法示意，不是可复制运行的 TypeORM 实现；正式代码需使用锁定版本 API 和真实范围策略。

```sql
UPDATE demo_record
SET name = :name,
    remark = :remark,
    updated_by = :userId,
    updated_at = :nowUtc,
    version = version + 1
WHERE id = :recordId
  AND version = :expectedVersion
  AND deleted_at IS NULL
  AND (/* 由后端 update 操作策略构造的数据范围 */);
```

执行前按请求实际字段构建 SET 白名单；示例不能照搬为“未传 remark 也覆盖”。所有值绑定参数。affectedRows=1 后写引用与审计，同事务提交；=0 通过受限查询区分 404／409。更新已发生但审计写失败，则整个事务回滚。

新增请求在 code 唯一冲突时 409 RESOURCE_CONFLICT；不能因“之前查过不存在”省略唯一索引。归属转移先锁安全状态，验证来源与目标，再原子更新及递增 authz_epoch，保证与导出完成锁顺序一致。

## 9. 前端交互

列表入口要求 list；详情、编辑、删除按钮分别按 read／update／delete。用户点击有权限按钮后后端仍独立校验。表单编辑加载真实数据与 version，普通编辑不带 ownerDeptId；归属转移通过独立入口。

表单 remark 清空发 null，附件清空发 []；未变更字段不传。409 保留用户输入，允许重读比较；不直接拿新 version 自动覆盖。新增超时沿用原键查询结果，不立即新建第二条。

## 10. 最低测试矩阵

| 场景 | 预期 |
|---|---|
| 同编码并发新增 | 仅一条成功，另一 409；不复用软删编码 |
| 同键同摘要／不同摘要 | 同结果／409，无重复业务记录 |
| 无 list 权限直接调用列表 | 403 |
| 可查看但非本人记录被修改 | update 范围拒绝，404，不泄露对象 |
| 全量查看＋本人修改双角色 | 不获得全量修改 |
| 列表与 total | 过滤与可见范围一致 |
| 两人相同 version 更新 | 仅一条成功，另一 409 |
| 批量混入一条越权数据 | 整批失败，无部分修改 |
| 未传、null、空串、未知字段 | 分别满足 部分更新 契约 |
| 提交 createdBy／ownerDeptId 到普通编辑 | 400，不能越权改系统／归属字段 |
| 审计写失败 | 业务及引用全部回滚 |
| 关联他人临时文件／猜 fileId | 拒绝，不能绕过业务权限 |
| 转移归属后下载旧导出 | epoch 不匹配拒绝 |
| 导入预检后发生重复 | 确认整批失败，不部分成功 |
| Worker 重复投递／失租恢复 | 不重复完成，旧执行不能覆盖新结果 |

## 11. 后续模块如何复用

复制模块设计结构和目录模式，不复制设备台账的归属假设、状态和编码规则。先替换资源语言、字段和业务不变量，再设计权限及目标范围，最后复用基础服务和页面组件。

新增订单、QC 或设备控制时重新定义状态迁移、外部副作用与幂等；不把“CRUD 可以工作”等同于业务已经完整。公共模块抽取以至少两个真实使用点及相同语义为依据，客户专属流程留在客户包。
