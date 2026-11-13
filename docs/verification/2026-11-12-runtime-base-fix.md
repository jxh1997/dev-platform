# DP-002.3-b 运行系统处置与验证

日期：2026-11-12；批准：A-009，用户对[差异方案](2026-11-12-runtime-base-remediation-plan.md)回复“继续”。范围仅本地隔离发行镜像；未推送、未部署生产、未重启日常服务。

## 结论

实现及真实链路验证完成，**安全闭项仍阻断**。新Server原始扫描critical0／high0／medium24／low12／unknown2；新Web全部等级0。以上为包-CVE匹配数，不是独立漏洞数。旧镜像Server critical1／high34、Web critical3／high55的历史证据保留，不覆盖原报告。

2条unknown不能直接视为低风险：

| 公告 | 实际组件／版本 | 厂商现状／处置 |
|---|---|---|
| [CVE-2026-100290](https://security-tracker.debian.org/tracker/CVE-2026-100290) | libc6 2.36-9+deb12u14 | regcomp／regexec内存失败路径；Debian bookworm仍标vulnerable且无fixed version。保留阻断 |
| [CVE-2026-115819](https://security-tracker.debian.org/tracker/CVE-2026-115819) | 同上 | wide scanf窄字符目标缓冲区越界；Debian bookworm仍标vulnerable且无fixed version。保留阻断 |

厂商信息于2026-11-12读取；原始扫描描述、参考链接、时间及全部38条记录保留于[结构化证据](2026-11-12-runtime-base-fix-data.json)。Node普通JS路径未展示触发不等于glibc不受影响；未进行全源调用分析，不给出“不受影响”判定。其余24条medium和12条low同样保留，不宣称全部漏洞消除。后续归DP-002.3继续处理，维护责任为当前项目维护者；需要评级更新、明确不受影响证据或实际修复后重新判门槛，不能当作已接受风险。

## 实现

- `scripts/prepare-node-runtime.mjs`从固定Node24.22.2 Debian来源提取实际ldd加载器／库，组合scratch系统层；保留5个来源包的原版本／原始copyright及公共许可证。每个复制文件／符号链接列入清单，明确部分包只分发选定文件；未删除实际组件元数据换取扫描零值。
- Server保留Node、glibc、tzdata、CA／DNS／用户配置；无shell／npm／apt。原Node基底没有独立CA bundle，使用同一Node二进制的`tls.rootCertificates`生成，记录来源与SHA，不另下载信任根。
- Web仍为Nginx1.28.0、Alpine3.21分支，升级系统安全包至3.21.10状态；保留实际APK索引SHA、仓库和完整installed清单，清除下载缓存。保留原Nginx及模块版权文件、应用实际bundle的全部许可原文。OS包许可表达式来自APK元数据，不将其冒充为所有系统组件的完整源码分发／许可法律审查。
- 原Server199个运行依赖及Web79个实际bundle依赖的许可校验继续通过；Vben来源、应用API、权限规则、数据库结构不变。

## 已执行验证

环境：linux/arm64，专用`dev-platform-release-validation`项目与独立MySQL卷，合成账号；非root、只读根目录、cap_drop ALL、no-new-privileges。未声称amd64已验证。

1. 两端`docker build --build-arg BUILD_BASE_IMAGE=dev-platform-dependency-cache:verified -f deployment/Dockerfile.{server,web}`通过。使用已核验依赖缓存构建，并非默认基底全新无缓存安装的证明；最终镜像及来源ID在结构化证据中。
2. `docker compose -p dev-platform-release-validation --env-file .env.test -f deployment/compose.release-test.yaml up -d --wait`通过，编译后的迁移CLI及初始化通过。
3. `node tests/release-runtime.cjs`：7组通过，覆盖隔离／原始许可SHA、编译CLI、真实滑块登录、管理员API、SELF读取、绕过页面调用管理API及伪造写入403、未登录401、刷新及撤销、实际Nginx许可文件及浏览器登录／按钮权限。
4. `node tests/runtime-platform.cjs`：运行文件及包来源、无shell、只读根、MySQL DNS、受控NXDOMAIN、UTC／上海／Intl、随机数／JWT正反例、TLS可信CA成功／未知CA拒绝／错误主机名拒绝、Zod补丁早拒绝通过。宿主DNS代理将`.invalid`返回198.18测试地址，故负例使用容器内UDP DNS返回真实NXDOMAIN；不把该环境行为解释为域名不存在。
TLS夹具为本地临时自签名`CN=localhost`证书，SAN仅`localhost`／`127.0.0.1`，有效期1天，置于忽略的`.release/tls/{key,cert}.pem`并只读挂载；不是业务凭据，不进入镜像。重跑专项前需重新生成该夹具。

5. 固定Trivy0.76.2及2026-11-12漏洞库，离线扫描本地`docker save`归档；无Docker socket／无扫描网络／无忽略条目。两端实际扫描结果、完整包记录及原始报告SHA保留。Docker本地镜像ID与save归档config摘要不同，已分别记录并核对全部rootfs diff_ids及执行配置一致，不将两个标识混同。
6. 新脚本oxfmt、oxlint与`git diff --check`通过。业务源码未变，复用A-007源码集成／E2E证据，未重新跑全仓测试；真实新镜像链路如上单独验证。

## 运维边界与后续

Server没有sh，排查使用`docker exec … node -e …`，迁移使用`node dist/packages/database/src/cli.js`；更深入诊断使用独立调试容器，不能向业务镜像临时加shell。镜像提供的CA是Node当前根集合，企业私有CA须由后续部署契约显式注入，不能关闭TLS校验。

独立验证服务已停止，数据卷保留；旧dp0023及新dp0023-os标签均保留作对照，旧镜像仍有已知风险，不能作为安全发布回退。原始扫描JSON本地保留，体积较大的扫描tar在记录SHA后清理。未执行生产发布、远程CI、amd64或完整正式AC验收。

DP-002.3-b及父任务保持未勾选。后续先核实上游修复／完整原生调用可达性；若需自行回补glibc，必须另提确切来源与补丁、构建／ABI兼容及回退方案，经用户确认后实施，不在本轮静默改编译工具链或替换libc。
