<script lang="ts" setup>
import { computed, ref } from 'vue';
import {
  BasicLayout,
  LockScreen,
  TimezoneButton,
  UserDropdown,
} from '@vben/layouts';
import { useUserStore } from '@vben/stores';
import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDrawer,
} from 'element-plus';
import { useRouter } from 'vue-router';
import { useAuthStore } from '#/store';
import NotificationCenter from './components/notification-center.vue';
const user = useUserStore();
const auth = useAuthStore();
const router = useRouter();
const profileOpen = ref(false);
function navigate(path: string) {
  profileOpen.value = false;
  return router.push(path);
}
const menus = computed(() => [
  {
    text: '个人中心',
    icon: 'lucide:user-round',
    handler: () => (profileOpen.value = true),
  },
  {
    text: '我的会话',
    icon: 'lucide:shield',
    handler: () => navigate('/account/sessions'),
  },
  {
    text: '修改密码',
    icon: 'lucide:key-round',
    handler: () => navigate('/auth/change-password'),
  },
]);
</script>
<template>
  <BasicLayout @clear-preferences-and-logout="auth.logout(false)">
    <template #notification><NotificationCenter /></template>
    <template #timezone><TimezoneButton /></template>
    <template #lock-screen
      ><LockScreen avatar="/avatar.svg" @to-login="auth.logout(false)"
    /></template>
    <template #user-dropdown>
      <UserDropdown
        avatar="/avatar.svg"
        :menus="menus"
        :text="user.userInfo?.realName"
        :description="user.userInfo?.username"
        tag-text="BaJie Dev"
        @logout="auth.logout(false)"
        @clear-preferences-and-logout="auth.logout(false)"
      />
    </template>
  </BasicLayout>
  <ElDrawer v-model="profileOpen" title="个人中心" size="min(460px, 100vw)">
    <ElDescriptions :column="1" border>
      <ElDescriptionsItem label="账号">{{
        user.userInfo?.username
      }}</ElDescriptionsItem>
      <ElDescriptionsItem label="姓名">{{
        user.userInfo?.realName
      }}</ElDescriptionsItem>
      <ElDescriptionsItem label="角色标识">{{
        user.userInfo?.roles?.join('、') || '未分配角色'
      }}</ElDescriptionsItem>
      <ElDescriptionsItem label="产品"
        >DevPlatform / BaJie Dev</ElDescriptionsItem
      >
    </ElDescriptions>
    <div class="mt-6 flex gap-3">
      <ElButton @click="navigate('/account/sessions')">我的会话</ElButton
      ><ElButton type="primary" @click="navigate('/auth/change-password')"
        >修改密码</ElButton
      >
    </div>
  </ElDrawer>
</template>
