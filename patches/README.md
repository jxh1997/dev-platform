# 已审查的依赖安全补丁

批准A-007／DP-002.2-E，2026-11-12。适用pnpm10.33.4、Node24.22.2。
只通过patchedDependencies和锁文件安装，不直接修改node_modules作为交付。

| 补丁 | 公告／范围 |
|---|---|
| zod@3.25.76 | GHSA-mrhx-c7xc-m3w5；v3 Array／Set已有上限提前终止；附带旧v4 Array／Map／Set大小约束回移 |
| zod@4.6.7 | 同一公告；默认v4已有修复，补齐其v3兼容实现 |
| deepmerge@4.3.1 | GHSA-gcqx-w48m-w2h4；目标复制／source合并使用自有数据属性写入 |

Zod回移依据上游4.6.7的集合上限处理：先生成原有大小错误，再停止子元素解析与Promise分配；不添加全局长度上限，无约束集合保留原契约。旧v4的post-parse checks会再次检查仍未解析的值，因此使用模块内WeakSet仅标记被大小上限拒绝的payload，跳过该payload的后续checks，不改变其他payload。WeakSet不保留已不可达payload。

deepmerge保留继承属性保护、普通对象输出、Symbol及数组／自定义合并。危险属性安全写为自有数据属性，不触发原型setter，不无条件删除合法constructor／prototype字段。许可证和原版权原样保留。

维护要求：

- 升级先重新审查上游代码及相关入口，不按版本号自动删除补丁。
- 上游实际修复且本仓回归通过后才能移除；不要设置allowUnusedPatches等隐藏失效补丁。
- 新公告按ID和触发条件重审，本记录不是包名级豁免。
- 原始pnpm audit仍可能版本命中Zod3和deepmerge，必须保留JSON及非零退出码，另列处置证据；不伪造版本或全局忽略。
- pnpm patch-commit生成patch与锁；修改后重做冻结安装、安装文件摘要及否定回归。
- 自有临时项目已验证上下文不匹配时ERR_PNPM_PATCH_FAILED、退出1。
- 核对源码及发行入口：当前3补丁、12文件，不能只验证编辑目录。

安全回归：node --test tests/schema-merge-dependency.cjs。
表单兼容：pnpm exec vitest run packages/@core/ui-kit/form-ui/__tests__ --environment happy-dom。

批准、原始告警、处置与实际验证见[报告](../docs/verification/2026-11-12-schema-merge-fix.md)
和[结构化证据](../docs/verification/2026-11-12-schema-merge-fix-data.json)。
