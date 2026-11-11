<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import { AuthenticationLogin, z } from '@vben/common-ui';
import { useAuthStore } from '#/store';
import { ref, useTemplateRef } from 'vue';
import LoginCaptcha from './login-captcha.vue';
const captchaToken = ref('');
const captcha = useTemplateRef<InstanceType<typeof LoginCaptcha>>('captcha');
defineOptions({ name: 'Login' });
const authStore = useAuthStore();
const usernameStorageKey = `${import.meta.env.VITE_APP_NAMESPACE}:${location.origin}:remembered-username`;
const formSchema: VbenFormSchema[] = [
  {
    component: 'VbenInput',
    fieldName: 'username',
    label: '账号',
    componentProps: { placeholder: '请输入账号', autocomplete: 'username' },
    rules: z.string().min(1, '请输入账号'),
  },
  {
    component: 'VbenInputPassword',
    fieldName: 'password',
    label: '密码',
    componentProps: {
      placeholder: '请输入密码',
      autocomplete: 'current-password',
    },
    rules: z.string().min(1, '请输入密码'),
  },
];
async function submit(values: Record<string, unknown>) {
  if (!captchaToken.value) {
    captcha.value?.requireVerification();
    return;
  }
  if (
    typeof values.username === 'string' &&
    typeof values.password === 'string'
  )
    try {
      await authStore.authLogin({
        username: values.username,
        password: values.password,
        captchaToken: captchaToken.value,
      });
    } catch {
      // 请求层已提示具体失败；登录凭证无论密码正确与否只能使用一次。
      await captcha.value?.reset();
    }
}
</script>
<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-qrcode-login="false"
    :show-forget-password="false"
    :show-register="false"
    :show-third-party-login="false"
    :show-remember-me="true"
    :username-storage-key="usernameStorageKey"
    title="欢迎回来"
    sub-title="请输入您的账号信息，登录管理工作台"
    @submit="submit"
    ><template #captcha
      ><LoginCaptcha ref="captcha" v-model="captchaToken" /></template
  ></AuthenticationLogin>
</template>
