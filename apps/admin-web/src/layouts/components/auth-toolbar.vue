<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { Preferences, ThemeToggle } from '@vben/layouts';
import { preferences, updatePreferences } from '@vben/preferences';
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
} from 'element-plus';
import { PanelLeft, Settings } from '@vben/icons';
import { useAuthStore } from '#/store';
const auth = useAuthStore();
const settings = useTemplateRef<InstanceType<typeof Preferences>>('settings');
function changeLayout(value: string) {
  if (
    value === 'panel-left' ||
    value === 'panel-center' ||
    value === 'panel-right'
  )
    updatePreferences({ app: { authPageLayout: value } });
}
</script>
<template>
  <div class="auth-tools" aria-label="登录页设置">
    <ElDropdown trigger="click" @command="changeLayout">
      <ElButton text aria-label="登录布局" title="登录布局"
        ><PanelLeft class="size-4"
      /></ElButton>
      <template #dropdown
        ><ElDropdownMenu
          ><ElDropdownItem
            command="panel-left"
            :disabled="preferences.app.authPageLayout === 'panel-left'"
            >居左</ElDropdownItem
          ><ElDropdownItem
            command="panel-center"
            :disabled="preferences.app.authPageLayout === 'panel-center'"
            >居中</ElDropdownItem
          ><ElDropdownItem
            command="panel-right"
            :disabled="preferences.app.authPageLayout === 'panel-right'"
            >居右</ElDropdownItem
          ></ElDropdownMenu
        ></template
      >
    </ElDropdown>
    <ThemeToggle />
    <Preferences
      ref="settings"
      :show-button="false"
      @clear-preferences-and-logout="auth.logout(false)"
      ><ElButton
        text
        aria-label="偏好设置"
        title="偏好设置"
        @click="settings?.open()"
        ><Settings class="size-4" /></ElButton
    ></Preferences>
  </div>
</template>
<style scoped>
.auth-tools {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
