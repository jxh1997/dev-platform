# ADR-002：MySQL 大整数自增主键安全回读

日期：2026-11-10。状态：已实施。

## 证据

MySQL BIGINT 超过 `Number.MAX_SAFE_INTEGER` 后，mysql2 按配置返回字符串 insertId。当前 TypeORM 0.3.31 的 MysqlDriver.createGeneratedMap 使用 `insertId + entityIndex` 计算生成映射；对于字符串 insertId 和索引 0，可能形成尾部拼接的错误 ID。仅测试 SELECT CAST 或小整数主键发现不了此问题。

## 决策

不修改 node_modules、不把 ID 转成 Number、不靠截掉末尾字符修正。台账先执行 INSERT，再在相同事务 EntityManager 中按唯一编码回读实际记录；管理员初始化按唯一账号回读实际用户。审计与接口响应只使用回读后的 ID。审计表自身生成的 ID 不作为插入用例输出，不依赖其生成映射。

后续实体如无自然唯一键，应先约定同连接安全取回主键的方式并增加真实大整数测试，不能盲目复用 ORM 的生成映射或全局连接的 LAST_INSERT_ID。

## 验证

集成测试先显式插入 `9007199254740993` 作为专用测试库的自增起点，再通过真实新增 API 获取大整数 ID，验证 ID 为字符串、详情可回读且与数据库唯一键读取一致。后续测试运行继续使用大整数自增 ID，覆盖幂等、更新、删除与并发版本条件。测试只清理本次随机用户与记录，不重置整库计数器。
