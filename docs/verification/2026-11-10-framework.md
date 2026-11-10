# DevPlatform M0 工程验证

日期：2026-11-10。版本：0.1.0-alpha.1。工作区尚未提交；未推送、未发布。

## 交付范围

固定前端来源、pnpm workspace、NestJS HTTP 装配、TypeORM 数据库包、初始迁移、一次性管理员初始化、认证与会话、操作权限、ALL / SELF 台账、事务审计、生成契约、开发与部署 Compose、Nginx、CI 定义及工程文档。详细范围见 ADR-001 与模块说明。

## 本机验证

平台为 macOS arm64，Node 24.22.2、pnpm 10.33.4。没有使用系统 Node 20，隔离工具位于 `/tmp/devplatform-tools`。独立 MySQL 8.4.13 开发与测试数据目录分别位于 `/tmp/devplatform-m0-mysql`、`/tmp/devplatform-m0-test-mysql`，端口分别 13306 / 13307；未修改原有 MySQL 8.0 实例。临时目录在系统清理后不保证保留，长期开发建议切换到文档中的命名卷方案。

| 检查 | 实际结果 |
|---|---|
| 固定 tag / commit | 已核验 v5.7.0 对应 63a38dce49ba109f61607994e21ba921d8e970e9 |
| pnpm install --frozen-lockfile | 通过；无修改锁文件安装 |
| pnpm lint | 格式与 correctness 检查通过 |
| pnpm typecheck | 前后端通过 |
| pnpm check:boundaries | 通过；自有应用静态边界和业务方法检查 |
| pnpm api:generate / api:check | 无数据库导出成功，schema / TS 类型一致 |
| pnpm build | Server 编译与启用前端及 10 个依赖构建通过 |
| db:migration:run / db:seed | 空库执行成功；检查不覆盖已有授权 |
| admin:init | 开发库首次成功；第二次拒绝；随机本地凭据仅保存忽略文件 `.env.admin` |
| pnpm test:integration | 真实 MySQL 15 组通过；每次清理本次随机用户及数据 |
| pnpm test:e2e | Chromium 真实 API 测试通过，含刷新后权限重建；没有 5xx 资源错误 |
| Compose config --quiet | 开发、测试及部署配置解析通过 |

集成测试覆盖：未登录、方法白名单与覆盖拒绝、JSON 解析与 1 MiB 限制、身份／菜单／当前权限、强制改密、无功能权限、未知字段与分页、null、并发幂等、异摘要冲突、操作级 SELF、并发版本冲突、审计失败业务回滚、BIGINT 大整数自增生成／API 回读、驱动 DECIMAL 字符串与 UTC 往返、软删除与编码占用、Access 过期、刷新 Origin 与旧值复用撤销、改密和退出撤销。

审计故障注入预期产生一次安全 500 日志；这证明失败回滚路径，不是将 500 当作业务成功。SQL 字段 DELETE 与权限码 delete 不属于 HTTP DELETE，不为方法白名单修改 SQL 或权限语义。

浏览器验证：真实登录 → 动态菜单 → 新增 → 重载恢复 → 编辑 → 删除；检查 localStorage 不含 JWT。测试资料均为虚构。早期浏览器测试发现恢复权限码缺失和懒加载样式重优化 504，已修复并重跑通过。页面截图见 [framework.png](framework.png)（虚构验证数据）。

大整数边界测试暴露了 ORM 生成映射兼容问题，已按 [ADR-002](../architecture/ADR-002-bigint-identity.md) 改为事务内唯一键回读，并重跑 15 组通过。

## 容器验证

专用 Colima profile `dev-platform` / Linux arm64 / Docker 29.5.2 / Compose 5.7.0。构建与运行均在本机隔离 VM，非正式生产发布。

- Server 和 Web 镜像构建通过；容器内冻结安装、批准的依赖重建、stub、TypeScript 编译和前端生产构建通过。
- 初建 VM 的 DNS／代理问题仅在该 VM 内处理。两个超大／停滞依赖使用本机 pnpm 的原始内容缓存补齐，并在容器中执行 `pnpm install --offline --frozen-lockfile --ignore-scripts` 成功后保存受控缓存镜像，再完成提供的 Dockerfile 构建。未完成的是完全无缓存的网络下载路径，不将缓存安装描述为无缓存验证。
- `compose up -d --wait` 通过：MySQL、Server、Web 均 healthy；独立 migrate 容器退出码 0。
- 已确认运行 Server 的镜像 ID 与最终修复镜像一致，使用非 root `node`；API 端口未发布，Server 不接收 MYSQL_ROOT_PASSWORD。
- 经 Nginx 检查 `/`、`/logo.svg`、`/api/v1/health/ready` 均 200；未登录台账 401；禁用 HTTP DELETE 返回 405。
- MySQL 容器重启后 API 自动恢复健康，迁移记录数量一致，命名卷保留数据。这是重启持久性验证，不是备份恢复演练。
- 本地生产形态验证入口为 `http://127.0.0.1:8080`；只验证页面、探针和拒绝分支。生产 Cookie 需要配置真实 HTTPS 入口，未执行真实域名／证书或生产浏览器登录验收。

构建与运行镜像标识：

| 镜像 | 本轮 image ID／digest |
|---|---|
| `dev-platform-server:0.1.0-alpha.1` | `sha256:84ea7ccdcf6723d8e25b99623169c6d3f3c437af81f1da547d699e5b59dc41aa` |
| `dev-platform-web:0.1.0-alpha.1` | `sha256:432cb6d20318a75e81df703a032045ace2e5b9b614c19b68ecbe513d84e140d2` |
| `node:24.22.2-bookworm-slim` | `sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9` |
| `mysql:8.4.7` | `sha256:0426ec38c7a10aa45ba383887df7878f74ee70e2fd589c7b69207f3577901903` |
| `nginxinc/nginx-unprivileged:1.28.0-alpine` | `sha256:c97ff0bf7cbae369953c6da1232ec14ad9f971d66360c5698db0856a4cd657a0` |

本机可直接使用已构建镜像启动（不必重新下载）：

```bash
docker compose --env-file deployment/.env -f deployment/compose.yaml up -d --wait
```

本机后续修改源码可选择已验证缓存：

```bash
docker compose --env-file deployment/.env -f deployment/compose.yaml build --build-arg BUILD_BASE_IMAGE=dev-platform-dependency-cache:verified
```

默认 Dockerfile 的干净基底仍为 Node 24.22.2，缓存镜像不是外部发布依赖。当前 VM 拉取需现有网络代理可用。

依赖审计及已处理／未处理项见 [依赖审计记录](dependency-audit.md)；当前 critical=0，仍有高风险条目，正式生产发布前必须完成剩余处理。

## 已知范围与后续

- 完整 RBAC、部门树、文件、任务、导入导出、生成器均未启用，不能视作全部 P0 或正式版。
- 单实例限流及直接用户操作授权是 M0 最小实现；扩容与 M1 用户／角色管理需独立设计和迁移。
- 未执行真实生产发布、GitHub 远程 CI、第二客户实例升级、备份恢复及 RPO / RTO 演练。
- 已有 Git 文档均为此前未提交内容，本次保留并继续扩展，没有 reset、清空历史或自动提交。
- 本地 `.env`、`.env.test`、`.env.admin`、`deployment/.env` 含随机秘密，被 Git 和 Docker context 排除；不得输出到工单或提交。

复现命令与部署要求见根 README 及 deployment/README.md。

## 本机当前启动方式

开发数据库监听 127.0.0.1:13306，API 监听 127.0.0.1:4310。隔离工具目录不修改系统 Node；在本次机器会话内可用以下命令启动或恢复开发进程：

```bash
PATH="/tmp/devplatform-tools/node_modules/node/bin:/tmp/devplatform-tools/node_modules/.bin:$PATH" pnpm dev:server
PATH="/tmp/devplatform-tools/node_modules/node/bin:/tmp/devplatform-tools/node_modules/.bin:$PATH" pnpm dev:web
```

长期使用请按根 README 安装固定 Node / pnpm，并使用部署配置的持久卷。管理员凭据仅见本地 `.env.admin`，首次登录要求改密；不在回复或报告中展示密码。
