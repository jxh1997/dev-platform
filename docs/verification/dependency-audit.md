# M0 依赖审计记录

日期：2026-11-10。命令：`pnpm audit --prod --json`。这是整个 pnpm 工作区的生产依赖图，其中包含构建／格式工具工作区本身的 dependencies；不等于每个条目都能在当前业务端点中被利用，也不代表无需处理。

## 已处理

- NestJS 11.1.6 → 11.2.9、Swagger 11.2.0 → 11.4.8、Express 5.1.0 → 5.3.0、TypeORM 0.3.27 → 0.3.31、mysql2 3.15.3 → 3.23.1。均保留当前服务端主版本。
- tar 7.5.15 → 7.5.21、tinypool 2.1.0 → 2.1.2，显式覆盖当前依赖图中的构建工具间接版本；源码来源 v5.7.0 未升级。
- 修复后重新执行安装、类型、契约、真实数据库与浏览器验证，结果见主验证报告。

## 剩余结果

审计元数据条目数：critical=0，high=72，moderate=61，low=18。不能将 critical=0 表述为无漏洞。

| 涉及 high 的依赖 | 审计建议修复范围（原样记录） |
|---|---|
| @intlify/core-base | >=11.4.14 |
| @intlify/shared | >=11.4.14 |
| @tiptap/core | >=3.30.5 |
| @vue/server-renderer | >=3.5.42 |
| axios | >=1.18.0；>=1.20.0 |
| brace-expansion | >=2.1.2；>=2.1.3；>=2.1.4；>=2.1.5；>=2.1.6；>=5.0.10；>=5.0.11；>=5.0.7；>=5.0.8；>=5.0.9 |
| browserslist | >=4.28.7 |
| fast-uri | >=3.1.3；>=3.1.4；>=3.1.5；>=3.1.6；>=3.1.7 |
| follow-redirects | >=1.16.1；>=1.16.2 |
| form-data | >=4.0.6 |
| glob | >=10.5.0 |
| immutable | >=5.1.8 |
| js-yaml | >=3.15.0；>=3.15.1；>=3.15.2；>=4.3.0；>=4.3.1；>=4.3.2 |
| nanoid | >=3.3.16；>=3.3.18 |
| node-forge | <0.0.0；>=1.4.1 |
| path-to-regexp | >=8.4.0 |
| postcss | >=8.5.18 |
| prosemirror-view | >=1.42.3 |
| smol-toml | >=1.7.1 |
| source-map-js | >=1.2.2 |
| svgo | >=4.0.2；>=4.1.0 |
| undici | >=7.28.0；>=7.29.0；>=7.29.1；>=7.30.1 |
| vite | >=8.1.6 |
| vue-i18n | >=11.4.14 |
| zod | >=4.6.6 |

包含固定前端的浏览器／构建依赖、未启用模块的依赖及部分服务端间接依赖。例：Zod 审计建议涉及主版本变化，不能在固定前端基础上盲目全量 audit fix；SSR、开发服务器和工具 CLI 的实际可达性也需逐项核查。

当前用途是隔离开发和 M0 验证。正式生产发布前必须单独完成剩余依赖修复／可达性评估与回归，不能以当前启动成功替代生产安全验收。下次依赖改动后重新审计并更新此记录。

审计修复依据含 [tar 公告](https://github.com/advisories/GHSA-23hp-3jrh-7fpw)、[tinypool 公告](https://github.com/advisories/GHSA-85c8-ppgw-ccpr)、[TypeORM 公告](https://github.com/advisories/GHSA-2rp8-mm9q-fp49)、[mysql2 公告](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3)。
