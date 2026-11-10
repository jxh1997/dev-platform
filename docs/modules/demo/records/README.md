# 设备台账：M0 最小链路

本模块是产品基线启动任务的工程验证实现，完整业务设计参考 [模块指南](../../../development/module-guide.md)。当前只启用创建人归属，按操作分别支持 ALL / SELF；未实现部门归属、附件、转移、导入导出，不展示相应功能。

## 接口与权限

统一前缀 `/api/v1/demo/records`。

| 方法／路径 | 权限 | 行为 |
|---|---|---|
| GET / | demo:record:list | page 默认 1，pageSize 默认 20／最大 100；name 字面子串、status；稳定时间＋ID 倒序 |
| GET /:id | demo:record:read | 不可见与不存在均 404 |
| POST / | demo:record:create | Idempotency-Key 必填；code 唯一且软删不释放 |
| POST /:id/update | demo:record:update | JSON version 必填，未传不改，remark=null 清空，未知字段拒绝 |
| POST /:id/delete | demo:record:delete | JSON version 必填；软删除＋version 递增 |

字段：id／createdBy 为字符串；code 为 2—64 位大写字母、数字、-、_，创建后不可改；name 为 trim 后 1—100 字符；status 为 enabled／disabled；remark 最大 500 字符，空串规范化 null。version 初始 1，时间为 UTC ISO。台账状态不表示真实设备在线或可控。

## 事务与数据范围

Service 通过每个操作的独立权限构建范围。列表与 total 同一条件；修改与删除在最终 UPDATE 中包含 id、version、未删除及 SELF 创建人条件。失败后在当前操作范围内区分 404／409，不按 list 范围判断。

新增同用户创建通过用户行锁串行认领幂等键，摘要由规范化白名单输入生成。业务、成功审计与幂等结果同事务；同键异摘要 409；编码并发以数据库唯一约束兜底。更新审计失败回滚业务。M0 不启用幂等清理任务，容量维护在后续阶段实现。

## 验证

`pnpm test:integration` 验证真实 MySQL 范围、并发、幂等、校验、回滚和软删；`pnpm test:e2e` 验证真实登录、菜单、台账新增编辑删除和刷新恢复。运行结果见 `docs/verification/`，测试定义存在不等于已经执行通过。
