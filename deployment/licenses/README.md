# 补充许可原文

这里保留发布包未附完整材料时的来源证据，不按包名猜测授权。

sources.json 绑定包名／版本、来源 URL／提交、文件摘要。生成器校验摘要后复制到对应发行包；未知或材料缺失会拒绝生成。

TypeORM0.3.31 的 npm 元数据未带 gitHead，使用上游同版本 annotated tag 的 peeled commit，记录实际提交而非 tag object。
zod-defaults0.1.3 的发布 README 明确写 MIT，但其 LICENSE 链接缺失；README 原文与 SPDX 标准 MIT 文本分别保留并标明来源，不补写不存在的版权持有人。

下载原文仅在本次审查阶段进行；日常构建不联网抓取许可、不自动接受上游更新。源码或许可变更时重新审查 sources.json。
