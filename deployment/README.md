# 部署与运维：M0

## 开发数据库

仓库根目录运行 `pnpm env:init`，再执行 `docker compose --env-file .env -f deployment/compose.dev.yaml up -d --wait`。MySQL 仅暴露回环端口 13306，命名卷独立保存数据。测试使用 `.env.test` 和 `compose.test.yaml`（13307），不得共享开发数据库与凭据。已有卷的密码不会因修改环境文件自动更新，需走明确的数据库改密流程。

## 生产站点

以下为部署配置和操作流程，当前工程仍有未完成的依赖安全与恢复验收，正式生产发布前先完成验证报告中的剩余项。

1. 准备真实域名、证书和宿主 HTTPS 代理；外部入口的 Origin 必须与 APP_ORIGIN 一致。
2. 根目录执行 `APP_ORIGIN=https://实际域名 pnpm env:init --deployment`；生成 `deployment/.env`（600 权限、随机秘密），实例名等配置在此维护，禁止提交。
3. 执行 `docker compose --env-file deployment/.env -f deployment/compose.yaml config --quiet`。不要把展开后的完整 Compose 输出复制到工单，展开内容包含秘密。
4. 执行 `docker compose --env-file deployment/.env -f deployment/compose.yaml up -d --build --wait`。迁移容器在 MySQL 健康后执行，Server 等待其成功。迁移失败时停止发布、检查实际 DDL 状态，以新增迁移前滚或从备份恢复；不重写已执行迁移。
5. 宿主 HTTPS 代理将请求转到 `http://127.0.0.1:8080`，保留浏览器 Origin 和 Host，设置合理超时和请求体限制。容器 Nginx 转发 /api/v1，静态页面同源访问 API。生产 Secure Cookie 不支持通过 HTTP 直接登录。
6. 用隐藏输入设置单次 `INIT_ADMIN_USERNAME` 和 `INIT_ADMIN_PASSWORD`，执行：

```bash
docker compose --env-file deployment/.env -f deployment/compose.yaml run --rm \
  -e INIT_ADMIN_USERNAME -e INIT_ADMIN_PASSWORD server \
  node dist/packages/database/src/cli.js admin
unset INIT_ADMIN_USERNAME INIT_ADMIN_PASSWORD
```

管理员不能重复初始化，首次登录强制改密。`seed` 是只读基线检查，不每次覆盖授权。

## 健康与重启

`docker compose --env-file deployment/.env -f deployment/compose.yaml ps` 查看健康状态。`GET /api/v1/health/live` 为进程探针，`GET /api/v1/health/ready` 检查 MySQL。除健康、登录与刷新外默认认证，所有业务接口只用 GET / POST。Server 优雅关闭时销毁连接池。

开发停机使用对应文件的 `down`，不添加 `-v`；命名卷保留数据。禁止无范围 prune。生产单实例升级先停写、备份并验证，再运行唯一迁移、更新应用、冒烟后开放访问。

## 备份与恢复边界

本阶段只保存 MySQL 持久卷，未启用文件能力。上线前需要在目标环境完成数据库备份、异地保存和恢复演练。不要仅复制运行中的 MySQL 数据目录作为一致性备份，也不要仅回退镜像假定数据库结构已回退。当前不承诺 RPO / RTO，不声称已完成正式版备份恢复验收。

镜像固定版本标签；首次交付前在目标架构记录镜像 digest、锁文件摘要和迁移清单。当前 Server 镜像保留完整 pnpm 工作区以保持依赖链接，镜像裁剪在后续有体积与维护指标时实施。

## 构建缓存

两个 Dockerfile 默认从固定 Node 镜像构建，先按各工作区 manifest 冻结安装，再复制源码并执行依赖重建／stub 和应用构建。新增工作区时同步 manifest COPY 清单。

`BUILD_BASE_IMAGE` 可指定受控的、相同 Node 版本的预备依赖缓存镜像；本次网络下载停滞时使用本机 pnpm 的原始内容缓存完成容器内 `--offline --frozen-lockfile` 校验，保存为 `dev-platform-dependency-cache:verified`，再用于容器构建。缓存不发布，默认干净构建仍使用 Dockerfile 的 Node 基底和冻结锁文件。
