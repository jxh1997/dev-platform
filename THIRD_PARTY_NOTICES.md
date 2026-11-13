# 第三方来源与发行许可材料

DevPlatform 管理后台基于 [vue-vben-admin v5.7.0](https://github.com/vbenjs/vue-vben-admin/tree/v5.7.0)，固定 commit 63a38dce49ba109f61607994e21ba921d8e970e9，MIT 原文保留于 LICENSE.vben。上游 packages／internal 标识及必要版权声明保留，应用产品名称使用 DevPlatform／BaJie Dev。

每个实际发行产物附带：

- third-party/packages.json：该产物依赖的名称、版本、原始许可表达式、原文文件摘要及依赖锁摘要。
- third-party/licenses/：对应发行包的 LICENSE／COPYING／NOTICE 原文；Web 另外保留 Vite 从实际 bundle 生成的许可文本。
- third-party/files.json：实际文件及链接清单；不包含该清单自身的递归摘要。
- third-party/patches/：该产物涉及的安全修改及维护说明；补丁不改变原包版本／许可证。
- Web 的 third-party/public-assets.json：public 资源文件摘要及当前应用 manifest 声明的来源许可。运行时从外部服务加载、未嵌入本产物的资源不冒充为本地分发文件。

Server 只分发编译产物及解析后的生产依赖闭包；Web 仅分发构建静态文件与上述材料。不能把开发工作区全部依赖列为浏览器已打包内容。

补充许可的固定版本来源及摘要见 deployment/licenses/sources.json：
@tokenizer/token、cookie-signature、TypeORM 的发布包缺少独立原文时，保留对应上游提交中的原文。
zod-defaults0.1.3 的发布 README 明确声明 MIT，但未附其链接的 LICENSE 文件；保留发布者原始声明，并单独提供 SPDX MIT 标准条款，不编造作者／年份。清单明确区分发布者声明与标准条款来源。

许可表达式按来源保留，包括多选表达式；不将 OR 许可误写为某一单选限制。Node、Nginx 等基础镜像自身的许可和 OS 包清单属于镜像发行物核查，不能仅凭本应用 npm 清单宣称覆盖全部系统组件。

实际生成命令、镜像检查及验证边界见 docs/verification 的发行物验证记录。上述清单描述实际来源及分发材料，不代替未执行的生产发布／正式产品验收。
