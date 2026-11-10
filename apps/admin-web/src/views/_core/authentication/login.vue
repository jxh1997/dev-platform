<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import { AuthenticationLogin, z } from '@vben/common-ui';
import { useAuthStore } from '#/store';
const authStore = useAuthStore();
const formSchema: VbenFormSchema[] = [
  { component: 'VbenInput', fieldName: 'username', label: '账号', componentProps: { placeholder: '请输入账号', autocomplete: 'username' }, rules: z.string().min(1, '请输入账号') },
  { component: 'VbenInputPassword', fieldName: 'password', label: '密码', componentProps: { placeholder: '请输入密码', autocomplete: 'current-password' }, rules: z.string().min(1, '请输入密码') },
];
function submit(values: Record<string, unknown>) {
  if (typeof values.username === 'string' && typeof values.password === 'string') return authStore.authLogin({ username: values.username, password: values.password });
}
</script>
<template>
  <AuthenticationLogin :form-schema="formSchema" :loading="authStore.loginLoading" :show-code-login="false" :show-qrcode-login="false" :show-forget-password="false" :show-register="false" :show-third-party-login="false" :show-remember-me="false" @submit="submit" />
</template>
