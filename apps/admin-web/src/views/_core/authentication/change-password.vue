<script setup lang="ts">
import { reactive, ref, useTemplateRef } from 'vue';
import {
  ElButton,
  ElInput,
  ElForm,
  ElFormItem,
  ElAlert,
  ElMessage,
} from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { useAccessStore, resetAllStores } from '@vben/stores';
import { useRouter } from 'vue-router';
import { changePasswordApi } from '#/api/core/auth';
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const formRef = useTemplateRef<FormInstance>('formRef');
const loading = ref(false);
const message = ref('');
const router = useRouter();
const rules: FormRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 12, message: '新密码须为 6–12 位', trigger: 'blur' },
  ],
  confirmPassword: [
    {
      required: true,
      validator: (_rule, value: unknown, callback) =>
        callback(
          value === form.newPassword &&
            typeof value === 'string' &&
            value.length > 0
            ? undefined
            : new Error('两次输入的密码不一致'),
        ),
      trigger: 'blur',
    },
  ],
};
async function submit() {
  if (loading.value) return;
  if (!useAccessStore().accessToken) {
    await router.replace('/auth/login');
    return;
  }
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) {
    formRef.value?.$el.querySelector('.is-error input')?.focus();
    return;
  }
  loading.value = true;
  message.value = '';
  try {
    await changePasswordApi({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    form.currentPassword = form.newPassword = form.confirmPassword = '';
    resetAllStores();
    ElMessage.success('密码已修改，请使用新密码登录');
    await router.replace('/auth/login');
  } catch {
    message.value = '修改未完成，请检查当前密码后重试。输入已保留。';
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <section class="password-panel" aria-labelledby="password-title">
    <h1 id="password-title" class="password-title">设置新密码</h1>
    <p class="password-description">新密码为 6–12 位。保存后需要重新登录。</p>
    <ElAlert
      v-if="message"
      :title="message"
      type="error"
      :closable="false"
      show-icon
      class="mb-5"
      role="alert"
    />
    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      :disabled="loading"
      @submit.prevent="submit"
    >
      <ElFormItem label="当前密码" prop="currentPassword"
        ><ElInput
          v-model="form.currentPassword"
          name="currentPassword"
          type="password"
          autocomplete="current-password"
          show-password
      /></ElFormItem>
      <ElFormItem label="新密码" prop="newPassword"
        ><ElInput
          v-model="form.newPassword"
          name="newPassword"
          type="password"
          autocomplete="new-password"
          :maxlength="12"
          show-password
          placeholder="请输入 6–12 位新密码"
      /></ElFormItem>
      <ElFormItem label="确认新密码" prop="confirmPassword"
        ><ElInput
          v-model="form.confirmPassword"
          name="confirmPassword"
          type="password"
          autocomplete="new-password"
          :maxlength="12"
          show-password
      /></ElFormItem>
      <ElButton
        class="password-submit"
        type="primary"
        native-type="submit"
        :loading="loading"
        >保存并重新登录</ElButton
      >
    </ElForm>
  </section>
</template>
<style scoped>
.password-panel {
  width: 100%;
  max-width: 400px;
}
.password-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.4px;
}
.password-description {
  margin: 10px 0 28px;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
  line-height: 1.6;
}
.password-submit {
  width: 100%;
  margin-top: 8px;
}
</style>
