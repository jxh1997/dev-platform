# DevPlatform M0 工程基线实施计划

**Goal:** 交付可启动、可构建、使用真实 MySQL 的前后端工程与部署配置。

**Architecture:** pnpm 单仓库；固定 v5.7.0 管理后台来源，应用层接入真实 API。NestJS 装配 HTTP，backend-modules 管理认证及最小台账，database 集中实体和迁移，contracts 由 OpenAPI 生成。M0 不启用文件、任务、导入导出和未实现的数据范围。

**Tech Stack:** Vue 3 / Element Plus / Vben v5.7.0、NestJS / Express、TypeORM / MySQL 8.4、Docker Compose / Nginx。

## 1. 来源与工作区

- 固定上游 tag 与 commit，保留 LICENSE 和实际前端依赖目录，应用迁移至 apps/admin-web。
- 读取上游 engines、packageManager；建立根 scripts、锁文件、Node 版本与依赖基线。
- 验证：frozen install；只构建启用应用，不构建上游演示。

## 2. 数据与后端

- 创建 packages/database 的配置、实体、显式迁移和 CLI；配置缺失失败，synchronize=false。
- 创建 backend-modules 的认证、会话、权限、台账用例及成功审计；只使用 GET / POST。
- 初始化命令无默认密码；验证迁移、登录、刷新轮换、撤销、权限不足、本人范围、幂等与乐观锁。
- Server 添加统一响应、验证、异常、requestId、健康探针及 OpenAPI 导出模式。

## 3. 管理后台

- 沿用上游路由、状态、请求和布局；替换品牌与认证适配，关闭 Mock，删除演示账户与未启用菜单。
- 真实登录、动态菜单、台账列表与新增编辑删除；错误保留输入，POST 更新和删除。
- 生成 OpenAPI 类型，前端使用生成契约。

## 4. 部署与检查

- 创建环境模板、Dockerfile、开发及部署 Compose、Nginx、持久卷、迁移单一进程和健康检查。
- 接入类型、构建、格式、方法与边界检查及 CI；建立真实 MySQL 集成测试和页面冒烟。
- 本机缺失工具先寻找隔离替代；无法执行的验证如实记录，不用 Mock 宣称通过。

## 5. 交付

- 更新 README 的实际启动命令、依赖基线、模块说明及验证报告。
- 本地开发操作持续执行，不自动发布、不推送、不修改既有 MySQL 实例。

## 执行结果

M0 工程框架已落地；依赖安装、类型／构建、15 组真库测试、浏览器链路、容器镜像和健康启动通过。大整数生成映射兼容问题按 ADR-002 修复。剩余依赖审计、正式发布、文件／恢复和后续产品模块见验证报告，未以框架搭建代替正式版验收。
