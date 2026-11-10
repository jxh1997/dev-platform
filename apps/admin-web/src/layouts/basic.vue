<script lang="ts" setup>
import { computed } from 'vue';
import { BasicLayout, UserDropdown } from '@vben/layouts';
import { useUserStore } from '@vben/stores';
import { useRouter } from 'vue-router';
import { useAuthStore } from '#/store';
const user = useUserStore();
const auth = useAuthStore();
const router = useRouter();
const menus = computed(() => [{ text: '修改密码', icon: 'lucide:key-round', handler: () => router.push('/auth/change-password') }]);
</script>
<template>
  <BasicLayout @clear-preferences-and-logout="auth.logout(false)">
    <template #user-dropdown>
      <UserDropdown avatar="/avatar.svg" :menus="menus" :text="user.userInfo?.realName" description="BaJie Dev" tag-text="工作台" @logout="auth.logout(false)" />
    </template>
  </BasicLayout>
</template>
