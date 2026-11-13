# DP-003 测试分组验证交接

日期：2026-11-13；批准：A-010；[方案](../plans/2026-11-13-dp003-test-groups.md)。状态：已实现／本地定向验证通过；实现提交85f0bc1602c293e5f709aa7bd59801103aaf5c19；未发布、远程CI未运行。

基线提交1a8a0ae250932df6d71044309c87f5086c133057，验证时的工作区源码以结构化证据中的文件摘要标识；提交归档时已核对这些源码及配置摘要仍一致，现由实现提交85f0bc1固定。TODO已按提交归档约定勾选DP-003。

## 结果

- tests/integration.ts 现在只负责参数校验、加载和串行调度。transport 3组、records 7组、identity 20组；默认全套30组。每组独立创建应用／数据库连接和随机账号，保留组内流程顺序、专用环境保护、故障注入与清理范围。失败时仍尝试关闭应用、清理本次数据和释放连接，清理失败不会冒充成功。
- 原始30个 check 调用全部保留，逐个对照 token 摘要；系统路由覆盖用例仅调整搬迁后的 require／类型导入相对路径，断言未改。[映射及摘要](2026-11-13-dp003-case-map.json)。未将拆分组数当成新增业务覆盖。
- 新增 test:integration:run 供已经构建且未再修改的源码状态复用产物；原 test:integration 仍先构建。支持重复 --group，去重并按固定顺序执行；未知参数、未知／缺失／空组在环境加载和DB初始化前拒绝。运行时校验各组预期数量、总量非零及名称不重复。
- CI 在原 build 后增加入口保护回归，并将完整集成步骤改为复用产物，完整E2E保留。README提供实际命令和共享测试库不可并行说明。CI文件已改，不代表远程运行通过。
- 不修改业务源码、权限、数据库结构、依赖或锁文件；工作区既有依赖及发行物改动保留。

## 实际验证

环境：macOS宿主，Node24.22.2／pnpm10.33.4；Colima aarch64的专用MySQL8.4.7，库／实例／账号标识与本机13307目标已校验；仅使用合成数据。

| 命令 | 实际结果 |
|---|---|
| pnpm build:server | 通过；标准集成入口也再次完成构建 |
| pnpm exec tsc -p tsconfig.server.json --noEmit | 通过 |
| pnpm exec tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --strict --experimentalDecorators --emitDecoratorMetadata --esModuleInterop --skipLibCheck tests/integration.ts tests/integration-cli.test.ts | 通过；额外覆盖默认Server配置未包含的测试源码 |
| 修改TS的oxfmt检查、oxlint --deny correctness | 通过，7个TS文件 |
| pnpm check:boundaries；git diff --check | 通过 |
| pnpm exec tsx --test tests/integration-cli.test.ts | 3项通过；含7种非法输入子场景、默认／单组／多组／重复组、合法筛选拒绝非测试环境 |
| pnpm test:integration:run --group transport | 3组通过；测试1.20s，进程2.30s |
| pnpm test:integration:run --group records | 7组通过；测试3.17s，进程3.79s |
| pnpm test:integration:run --group identity | 20组通过；测试17.02s，进程17.61s |
| pnpm test:integration | 30组通过；测试20.61s，含构建及启动进程23.10s |
| pnpm test:integration --group transport --group records | 10组通过；测试4.19s，验证标准入口的参数转发 |

各单组名称集合与默认全套名称集合一致。[真实运行摘要与命令](2026-11-13-dp003-runtime-data.json)。这些是本次实测值，不承诺跨主机耗时或相对旧版本的提速比例；未运行旧版计时基准。

首次额外类型检查因当前TS要求显式 --ignoreConfig 拒绝执行；改用上表命令后发现并修复夹具递归函数返回类型、闭包收窄及搬迁类型导入问题，没有关闭严格检查。

## 环境故障与未验证项

首轮transport未通过，原因是原Colima20GB磁盘占满，MySQL返回临时表已满／提交binlog失败；不是功能断言通过。保留原镜像和卷，将同一专用本地Colima磁盘扩为24GB，MySQL恢复后约3.8GB可用；恢复后上述各组和全套全部重新执行通过。未prune、删除卷或重置数据库。曾启动的专用测试MySQL在验证结束后停止，卷保留；Colima仍运行，磁盘扩容保留。

本次未改E2E配置、规格或其夹具；E2E不引用新集成夹具，按获批方案的停止条件不重复运行浏览器或Web构建，沿用历史浏览器证据而不记作今日复测。正式AC矩阵不因测试搬迁勾选。远程CI、生产发布及跨架构未执行。

DP-003实现、本地验证及提交归档已完成。下一项DP-004需按认证／会话T3范围审查具体方案；剩余glibc修复按用户指示暂缓，原风险记录和发布门槛继续保留。
