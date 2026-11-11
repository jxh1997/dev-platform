# 2026-11-11 登录布局与滑块验证

按用户指定的 [登录页参考](https://ele.vben.pro/#/auth/login) 调整。在线 SPA 没有可提取正文，浏览器访问主机不可用；使用仓库固定 v5.7.0 与 [官方对应版本布局源码](https://github.com/vbenjs/vue-vben-admin/blob/v5.7.0/packages/effects/layouts/src/authentication/authentication.vue) 作为实现依据，不宣称逐像素匹配在线站点当前版本。

## 交付内容

- 复用 AuthPageLayout、内置插画、AuthenticationLogin、SliderCaptcha。左侧品牌／插画，右侧居中表单；居左／居中／居右、深浅主题、偏好设置与记住账号继续工作，品牌使用 DevPlatform／BaJie Dev。
- 滑块拖到最右侧后请求服务端校验，支持鼠标、触摸和键盘；加载、验证中、通过、失败、到期、刷新验证均有反馈。修复外层工具栏与内部同名类导致定位叠加的问题。
- 新增 challenge／verify 两个 POST 接口；Origin、HttpOnly Cookie 浏览器绑定、一次性凭证、过期清理、容量约束与独立限流。登录新增必填 captchaToken，并同步更新 DTO 生成的 OpenAPI／前端类型和调用者。
- 不接受客户端 verified 标记；缺失或无效凭证无法登录，错误密码也消费凭证，并发仅一次可进入认证。密码、JWT 和验证码凭证不写 localStorage。
- 无新依赖、数据库迁移、角色权限规则或生产部署变更。实现边界见 [认证模块](../modules/system/auth/README.md#登录滑块校验) 和 [设计](../plans/2026-11-11-login-slider-design.md)。

## 验证

本地 Node 24.22.2 / pnpm 10.33.4。MySQL 专用 13307，浏览器 Web 5778／API 4311；日常开发库管理员和真实用户密码未改动。测试随机创建并清理隔离账号，不在服务端加入测试绕过。

| 命令 | 结果 |
|---|---|
| `pnpm exec tsx tests/login-captcha.ts` | 通过：最短等待、未完成、跨浏览器、伪造、重放、挑战／凭证过期、并发一次和容量清理 |
| `pnpm test:integration` | 30 组真实 MySQL 通过，含滑块否定用例与独立来源限流；原有权限、事务、会话和绕过页面 API 拒绝继续通过 |
| `pnpm typecheck` | 通过 |
| `pnpm lint` | 通过，含新组件与底座滑块 |
| `pnpm build:web` | 通过 |
| `pnpm api:check` | API 契约一致 |
| `pnpm check:boundaries` | 通过 |
| `pnpm test:e2e` | 最终 7 项全部通过（2.0m），含首次登录改密后重新验证／登录、全部权限及通用交互回归 |

回归覆盖未验证不发登录请求、实际鼠标拖动、键盘验证、错误密码重置、刷新后验证失效及凭证不持久化；保留原有账号／角色／菜单、强制改密、本人会话、页面与直接 API 拒绝验证。

回归中修复了真实生命周期问题：固定认证布局缓存 Login，首次登录改密后回到登录页时不能继续使用此前已消费的滑块凭证；组件离开时清理、重新激活时获取新挑战，同时清理过期计时和过时异步响应。测试同步也补齐角色选择框加载等待和登录通知结束等待，不删除或放宽权限断言。

截图检查覆盖桌面／390px 窄窗口与深浅主题，无横向溢出；工具栏定位问题已修正。最终截图：[桌面浅色](login-slider/login-light.png)、[桌面深色](login-slider/login-dark.png)、[390px 窄窗口](login-slider/login-mobile.png)。

触摸路径沿用原有组件，未执行真机触摸测试；在线参考站未进行浏览器视觉核对，未执行生产发布。

## 限制

简单拖动是交互门槛，脚本仍可模拟完整挑战流程，不应作为强人机识别。需要对抗机器人时另接专业验证服务。验证码和限流状态仅适用于当前单进程部署，重启后需重新验证；多实例部署须先改为共享原子存储。短信、扫码、第三方登录与消息后端不在本次范围。

测试结束后停止 13307 专用数据库（保留卷），Playwright Web／API 已退出。日常 Web 5777、API 4310、MySQL 13306 保持运行；开发滑块接口实测返回 200、no-store 和 HttpOnly Cookie。
