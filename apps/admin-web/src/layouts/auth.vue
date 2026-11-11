<script lang="ts" setup>
import { AuthPageLayout } from '@vben/layouts';
import { preferences } from '@vben/preferences';
import AuthToolbar from './components/auth-toolbar.vue';
</script>
<template>
  <AuthPageLayout
    class="auth-shell"
    :class="`auth-layout-${preferences.app.authPageLayout}`"
    app-name="DevPlatform"
    :logo="preferences.logo.source"
    :logo-dark="preferences.logo.sourceDark"
    page-title="DevPlatform 管理工作台"
    page-description="统一业务入口，让管理工作更高效"
  >
    <template #logo>
      <a
        href="#/auth/login"
        class="auth-brand"
        aria-label="DevPlatform 登录首页"
      >
        <img :src="preferences.logo.source" width="40" height="40" alt="" />
        <span translate="no">DevPlatform</span>
      </a>
    </template>
    <template #toolbar
      ><div class="auth-toolbar-position"><AuthToolbar /></div
    ></template>
    <template #copyright><span>© 2026 BaJie Dev</span></template>
  </AuthPageLayout>
</template>
<style scoped>
.auth-shell {
  min-height: 100dvh;
}
.auth-brand {
  position: absolute;
  z-index: 10;
  top: 24px;
  left: 24px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: hsl(var(--foreground));
  font-size: 20px;
  font-weight: 600;
}
.auth-brand:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 5px;
}
.auth-toolbar-position {
  position: absolute;
  z-index: 20;
  top: 24px;
  right: 24px;
}
@media (max-width: 640px) {
  .auth-brand {
    top: 20px;
    left: 20px;
    font-size: 16px;
    gap: 8px;
  }
  .auth-brand img {
    width: 32px;
    height: 32px;
  }
  .auth-toolbar-position {
    top: 20px;
    right: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  :deep(.animate-float) {
    animation: none;
  }
}
</style>
