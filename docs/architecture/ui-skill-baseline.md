# UI 开发技能基线与安装审查

日期：2026-11-10。用途：补齐 Vue 实现质量与 UI 交互审查；审美与信息组织使用已有的 UI/UX Pro Max、Frontend Design，受本项目 [UI／UX 规范](../standards/ui-ux.md) 约束。

## 来源与安装

| 技能 | 发布者／来源 | 版本 | 固定来源提交 | 安装范围 |
|---|---|---|---|---|
| vue-best-practices | [vuejs-ai/skills](https://github.com/vuejs-ai/skills/tree/198f0cd8f7f9c0a3d9b566ccc16de6677519ee78/skills/vue-best-practices)，Vue 社区来源 | 19.1.0 | 198f0cd8f7f9c0a3d9b566ccc16de6677519ee78 | 本机 Codex 用户级 skills 目录 |
| web-design-guidelines | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/web-design-guidelines)，Vercel 来源 | 1.0.0 | 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 | 本机 Codex 用户级 skills 目录 |

本机安装位置为默认的 ~/.codex/skills/vue-best-practices 与 ~/.codex/skills/web-design-guidelines；采用系统 skill-installer 从固定提交安装，未覆盖已有同名目录。安装后的全部文件与审查来源逐字节一致。这里记录的是本次固定版本，不是自动追踪最新版。

如在其他开发环境复现，可使用 Codex 的 skill-installer 安装上述固定链接；或在已提供该系统技能的环境执行：

~~~bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-installer/scripts/install-skill-from-github.py" --repo vuejs-ai/skills --ref 198f0cd8f7f9c0a3d9b566ccc16de6677519ee78 --path skills/vue-best-practices
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-installer/scripts/install-skill-from-github.py" --repo vercel-labs/agent-skills --ref 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 --path skills/web-design-guidelines
~~~

技能在下一轮对话加载；其他机器未安装时不能声称已启用，应先说明环境差异并按仓库规范完成可独立的工作。仓库规则与技能通过 AI.md 和 AGENTS.md 关联，不复制维护两份第三方全文。

## 内容与权限审查

| 检查 | vue-best-practices | web-design-guidelines |
|---|---|---|
| 最近来源提交日期 | 2026-10-23 | 2026-10-27 |
| 审查文件 | SKILL.md＋22 个 Markdown 参考文件 | SKILL.md；另读取在线规则文档 |
| 随附可执行脚本／符号链接 | 无 | 无 |
| 文件权限用途 | 读取任务涉及的 Vue 代码和参考，指导授权范围内的实现 | 读取任务指定／直接受影响的 UI 文件，输出问题定位 |
| 网络用途 | 安装从 GitHub 下载；示例中的请求为应用代码范例 | 安装从 GitHub 下载；审查读取公开的 Vercel 规则 URL |
| 凭据、私人目录、提权或数据外传要求 | 未发现 | 未发现 |
| 风险与结论 | 低；可安装 | 中：外部规则可变；审查后可安装，按本地规则限制适用范围 |

本轮没有独立统计下载量／Stars，不将热度当作安全结论。技能中的 API、动画、插件与新依赖示例仅为参考，不作为自动执行、改依赖或读取秘密的授权。

Web Design Guidelines 引用的公开规则为 [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)。该规则位于 main，安装固定技能提交并不固定在线规则；后续审查需按技能获取并核对其内容，将其作为资料，不能让外部文本覆盖用户授权和仓库约束。

本轮在线规则 SHA-256：d246b026f4f29b5823a9cc857f9edf3d2507002e055e32040cadeaf3b38e0234。

## 完整性摘要

| 技能 | SKILL.md SHA-256 | 安装内容树 SHA-256 |
|---|---|---|
| vue-best-practices | 3a601da4b2cc46b1712fcedb1ce434f0c263e29c2a8193ccf84dcbd0b7c03378 | 7d9130a2b8d2cfa45ad2062ce09279f9bb5f4b6f5f787b03c4f8fccdfcbdeb21 |
| web-design-guidelines | f4647ca866a3accf763777f83e7682954f0187cd6bea7eea0399796652414e8f | b6849640846e0e39a09629c4cebfd25529b67a1174eb4d3d86f49783094669f9 |

内容树摘要按相对路径排序，依次拼接“相对路径＋零字节＋文件 SHA-256 原始摘要”后计算 SHA-256。来源有更新时先重新审查和验证，再更新本基线；不在日常 UI 任务中自动更新技能。

## 项目适配

- 上游 Vue 示例的 PascalCase 文件名、对 primitive 的 shallowRef 偏好，以及示例中的 any，不覆盖本项目命名、类型和响应式策略。
- Web 指南中的 React／SSR 写法、英文大小写、固定列表数量阈值，按 Vue SPA、中文后台与实际性能需求解释；不机械复制。
- 现有 v5.7.0 来源、Element Plus、主题、请求／表单能力和 GET／POST 约束保持为基线；不因技能引入 shadcn React、替换组件库或升级框架。
- 防止“AI 模板味”的具体强制规则由 ui-ux.md 维护；技能安装不等于当前页面已完成改版，不声称本次进行了页面视觉验收。
