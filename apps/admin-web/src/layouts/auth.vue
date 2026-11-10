<script lang="ts" setup>
import { ThemeToggle } from '@vben/layouts';
import { preferences } from '@vben/preferences';
</script>
<template>
  <div class="auth-shell">
    <header class="auth-header">
      <a
        href="#/auth/login"
        class="auth-brand"
        aria-label="DevPlatform 登录首页"
        ><img
          :src="preferences.logo.source"
          width="32"
          height="32"
          alt=""
        /><span translate="no">DevPlatform</span></a
      >
      <ThemeToggle />
    </header>
    <main class="auth-main">
      <aside class="auth-context">
        <span class="auth-label">BaJie Dev / 管理后台</span>
        <h2 class="auth-title">DevPlatform<br />管理工作台</h2>
        <p class="auth-intro">设备信息集中维护，业务记录清晰可查。</p>
        <p class="auth-help">
          使用已分配的账号登录。<br />首次登录请先完成密码设置。
        </p>
      </aside>
      <div class="auth-form"><RouterView /></div>
    </main>
    <footer class="auth-footer">© 2026 BaJie Dev</footer>
  </div>
</template>
<style scoped>
.auth-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
.auth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 40px;
}
.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}
.auth-brand:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 5px;
}
.auth-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  width: min(960px, 100%);
  margin: 0 auto;
  padding: 48px 32px;
  gap: 80px;
}
.auth-context {
  padding: 24px 0;
}
.auth-label {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}
.auth-title {
  margin: 20px 0;
  font-size: 38px;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: -1px;
}
.auth-intro,
.auth-help {
  font-size: 14px;
  color: hsl(var(--muted-foreground));
  line-height: 1.8;
}
.auth-help {
  margin-top: 48px;
  padding-top: 20px;
  border-top: 1px solid hsl(var(--border));
}
.auth-form {
  min-width: 0;
  width: 100%;
  padding: 16px 0;
}
.auth-footer {
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}
@media (max-width: 760px) {
  .auth-header {
    padding: 20px 24px;
  }
  .auth-main {
    grid-template-columns: 1fr;
    max-width: 448px;
    padding: 32px 24px;
    gap: 0;
  }
  .auth-context {
    display: none;
  }
}
</style>
