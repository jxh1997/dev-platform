# DP-002.2-D 模式解析依赖修复

日期：2026-11-12；批准A-006：用户在C批交付并请求确认D批后回复“继续”。依据[闭项计划D批](2026-11-12-risk-closure-plan.md)，仅定向修复glob／minimatch及必要传递依赖；E批及发行物未批准实施。工作区未提交，未发布。

## 审查与实际变更

已读取实际父包调用：TypeORM `DirectoryExportedClassesLoader`使用`glob.sync`；archiver-utils使用`glob.sync`和排除模式；Workbox使用`globSync`；rimraf异步／同步封装使用glob；NFT依赖glob；直接minimatch消费者使用`Minimatch`、`minimatch`和`minimatch.filter`。当前应用的Entity／Migration使用显式清单，不依赖外部传入glob。没有仅凭安装成功判断跨主版本兼容。

`pnpm-workspace.yaml`新增13条父包精确版本override，由pnpm10.33.4生成锁：

- glob14.0.5：仅TypeORM0.3.31、archiver-utils5.0.2、js-beautify1.15.4、rimraf6.1.3、workbox-build7.4.1、@vercel/nft1.5.0六个父包。
- minimatch11.0.8：仅@eslint/config-array0.23.5、@jspm/generator2.15.0、@typescript-eslint/typescript-estree8.59.4、circular-dependency-scanner3.0.1、editorconfig1.0.7、eslint10.4.0六个父包及新glob14.0.5。
- 新增4个package键：glob14.0.5、minimatch11.0.8、path-scurry3.0.0、@isaacs/nonrecursive-glob-match1.1.0。移除22个package键，包含4个旧glob、2个旧minimatch及不再引用的CLI／格式化／缓存等分支；也包含pnpm清理的旧Babel辅助分支与sax旧版本。没有其他新增／升级的包键，完整差异见结构化证据。
- 保留minimatch5.1.9与全部A／B／C修复，不改Zod、deepmerge、Vben来源、API、数据库／历史迁移或UI源码。

## 验证与范围

| 命令／检查 | 实际结果 |
|---|---|
| 官方注册表／实际manifest | glob14.0.5、minimatch11.0.8存在，要求Node18／20／>=22及Node20／>=22，与本仓Node24.22.2一致 |
| `pnpm install --lockfile-only --ignore-scripts` | 通过，8.5秒；保留本批前输入摘要 |
| `pnpm install --frozen-lockfile --ignore-scripts` | 通过，1.9秒；新增4包已安装，不执行无关postinstall |
| `node --test tests/pattern-dependency.cjs` | 新增6项全部通过，约0.56秒，每项独立子进程限时8秒 |
| 解析父包与模式行为 | 六个glob父包实际解析14.0.5，六个直接minimatch父包解析11.0.8；验证sync／globSync别名、Minimatch／filter、否定／ignore／隐藏文件、字面量转义和Windows反斜杠选项；优化级别2放大模式在限时内完成 |
| 取消安全回归 | Promise与Stream在首个目录读取回调触发取消后均拒绝，观察40ms期间读取次数保持1；预取消时未发生任何目录读取。夹具仅20个子目录，不在业务API上执行DoS |
| TypeORM加载 | 实际DirectoryExportedClassesLoader从临时路径导入类并排除d.ts；真实应用显式Entity／Migration加载由真库集成覆盖 |
| 文件工具真实调用 | archiver-utils排除、真实ZIP输出、Workbox文件hash／size清单、rimraf仅删除临时目录中匹配的.tmp并保留.txt、NFT依赖追踪及EditorConfig均通过；js-beautify等未宣称完整CLI功能验收 |
| `pnpm build:server`／`pnpm build:web` | 各通过一次；Web11任务、0缓存、11.84秒 |
| API契约／边界 | `pnpm exec tsx scripts/api.ts --check`、`pnpm check:boundaries`通过 |
| `pnpm exec tsx tests/integration.ts` | 隔离真实MySQL全部30组通过，复用本批Server产物，含初始化／迁移、权限／会话／并发／事务回滚 |
| 新测试格式／lint | oxfmt／oxlint correctness通过 |
| 许可原文 | 新增4个name/version均为BlueOak-1.0.0，有安装后manifest及独立许可原文，登记于证据；完整分发留002.3 |

初次匹配测试的子进程字符串少转义了一层反斜杠，将Windows分隔符吞掉；改为`String.fromCharCode(92)`明确构造后同一断言通过。没有改变产品代码、放宽匹配结果或删除失败断言。

未重复完整UI E2E／Web类型检查：本批无UI／TS源变动，C批完整7项E2E及类型检查保留为历史证据，D批由父包真实调用、两端构建及真库集成覆盖受影响路径。Windows选项在macOS临时目录中验证，不等同原生Windows验收；完整CLI、Linux镜像及WASM回退未执行。此前工具peer警告仍保留，不把安装完成解释为全部插件无风险。

## 审计差分

`pnpm audit --prod --json`返回有效JSON、退出1。**仅移除glob两条及minimatch一条公告，5条降至2条；无新增公告，剩余两条排序归一后字段与前次完全一致。** metadata为critical0／high2／moderate0／low1，与公告记录数不是同一口径。剩余：Zod集合资源消耗（high，含3／4分支）、deepmerge返回对象原型污染（low）。

[结构化证据](2026-11-12-pattern-dependency-fix-data.json)保留完整移除／剩余条目、路径、锁package差异、输入／原始响应摘要及新增包许可。取消回归依据[glob公告](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)，模式放大回归依据[minimatch公告](https://github.com/advisories/GHSA-g3hv-75wg-m249)；CLI注入公告由版本升级后审计无命中确认，未执行危险shell样本。

## 环境、回退与下一步

Node24.22.2／pnpm10.33.4；专用MySQL13307、API4311。集成使用原隔离库，未更改开发库／真实管理员；结束停止专用MySQL并保留卷。没有启动本批浏览器服务、重启日常开发服务或发布。已加载旧模块的日常进程需正常重启后加载新依赖。

回退仅移除本批13条父包override并由pnpm重新解析对应锁，保留A／B／C及用户改动；旧版本风险会恢复并继续阻断，不reset全仓库。D批完成不代表DP-002闭项，E批两条风险与发行物／许可仍待处理；E批须细化兼容方案并经确认后实施。
