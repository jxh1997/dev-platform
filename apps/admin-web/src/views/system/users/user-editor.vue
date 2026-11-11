<script setup lang="ts">
import { useUnsavedChanges } from '../use-unsaved-changes';
import { computed, reactive, ref, useTemplateRef } from 'vue';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  ElSwitch,
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from 'element-plus';
import {
  allOptions,
  systemApi,
  type ManagedRole,
  type ManagedUser,
} from '#/api/system';
const emit = defineEmits<{ saved: [] }>();
const visible = ref(false),
  saving = ref(false),
  loading = ref(false),
  error = ref('');
const mode = ref<'create' | 'edit' | 'roles' | 'reset'>('create');
const current = ref<ManagedUser>();
const roles = ref<ManagedRole[]>([]);
const form = useTemplateRef<FormInstance>('form');
const draft = reactive({
  username: '',
  realName: '',
  password: '',
  enabled: true,
  roleIds: [] as string[],
});
const titles = {
  create: '新增用户',
  edit: '编辑用户',
  roles: '分配角色',
  reset: '重置密码',
};
const title = computed(() => titles[mode.value]);
const rules: FormRules = {
  username: [
    {
      required: true,
      pattern: /^[a-zA-Z0-9_.-]{3,64}$/,
      message: '账号须为 3–64 位字母、数字、点、横线或下划线',
      trigger: 'blur',
    },
  ],
  realName: [
    {
      required: true,
      min: 1,
      max: 100,
      message: '请输入 1–100 位姓名',
      trigger: 'blur',
    },
  ],
  password: [
    {
      required: true,
      min: 6,
      max: 12,
      message: '密码须为 6–12 位',
      trigger: 'blur',
    },
  ],
};
let creationKey = '';
let initial = '';
useUnsavedChanges(
  () => visible.value && initial !== JSON.stringify(draft),
  () => saving.value,
);
async function open(next: typeof mode.value, user?: ManagedUser) {
  creationKey = crypto.randomUUID();
  mode.value = next;
  current.value = user;
  Object.assign(draft, {
    username: user?.username ?? '',
    realName: user?.realName ?? '',
    password: '',
    enabled: user?.enabled ?? true,
    roleIds: [...(user?.roleIds ?? [])],
  });
  initial = JSON.stringify(draft);
  error.value = '';
  roles.value = [];
  visible.value = true;
  if (next === 'roles') {
    loading.value = true;
    try {
      roles.value = await allOptions(systemApi.roles);
    } catch {
      error.value = '角色选项加载失败，请关闭后重试。';
    } finally {
      loading.value = false;
    }
  }
}
async function close(done: () => void) {
  if (saving.value) return;
  if (initial !== JSON.stringify(draft)) {
    try {
      await ElMessageBox.confirm('关闭后将丢失未保存的修改。', '放弃修改？', {
        confirmButtonText: '放弃修改',
        cancelButtonText: '继续编辑',
      });
    } catch {
      return;
    }
  }
  done();
  draft.password = '';
}
async function save() {
  if (saving.value || loading.value || error.value) return;
  if (!(await form.value?.validate().catch(() => false))) {
    form.value?.$el.querySelector('.is-error input')?.focus();
    return;
  }
  saving.value = true;
  try {
    const user = current.value;
    if (mode.value === 'create')
      await systemApi.createUser(
        {
          username: draft.username,
          realName: draft.realName,
          password: draft.password,
        },
        creationKey,
      );
    else if (user && mode.value === 'edit')
      await systemApi.updateUser(user.id, {
        version: user.version,
        realName: draft.realName,
        enabled: draft.enabled,
      });
    else if (user && mode.value === 'roles')
      await systemApi.assignRoles(user.id, {
        version: user.version,
        roleIds: draft.roleIds,
      });
    else if (user && mode.value === 'reset')
      await systemApi.resetPassword(user.id, {
        version: user.version,
        password: draft.password,
      });
    visible.value = false;
    draft.password = '';
    ElMessage.success('用户设置已保存');
    emit('saved');
  } catch {
    /* 统一请求层显示错误；保留输入与原 version，不覆盖冲突。 */
  } finally {
    saving.value = false;
  }
}
defineExpose({ open });
</script>
<template>
  <ElDialog
    v-model="visible"
    :title="title"
    width="560px"
    :before-close="close"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    @closed="form?.clearValidate()"
  >
    <ElAlert v-if="error" :title="error" type="error" :closable="false" />
    <ElForm
      ref="form"
      :model="draft"
      :rules="rules"
      label-position="top"
      @submit.prevent="save"
    >
      <template v-if="mode === 'create' || mode === 'edit'">
        <ElFormItem label="账号" prop="username"
          ><ElInput
            v-model="draft.username"
            name="username"
            autocomplete="off"
            :disabled="mode === 'edit'"
            :spellcheck="false"
        /></ElFormItem>
        <ElFormItem label="姓名" prop="realName"
          ><ElInput
            v-model="draft.realName"
            name="realName"
            autocomplete="off"
            maxlength="100"
        /></ElFormItem>
        <ElFormItem v-if="mode === 'edit'" label="账号状态"
          ><ElSwitch
            v-model="draft.enabled"
            active-text="启用"
            inactive-text="禁用"
        /></ElFormItem>
      </template>
      <ElFormItem
        v-if="mode === 'create' || mode === 'reset'"
        label="临时密码"
        prop="password"
        ><ElInput
          v-model="draft.password"
          name="new-password"
          type="password"
          autocomplete="new-password"
          show-password
        /><span>首次登录必须改密；重置将撤销该用户全部会话。</span></ElFormItem
      >
      <ElFormItem v-if="mode === 'roles'" label="角色（全量替换）"
        ><ElSelect
          v-model="draft.roleIds"
          multiple
          filterable
          :loading="loading"
          :disabled="loading || !!error"
          aria-label="分配角色"
          style="width: 100%"
          ><ElOption
            v-for="role in roles"
            :key="role.id"
            :value="role.id"
            :label="role.name"
            :disabled="!role.enabled" /></ElSelect
      ></ElFormItem>
    </ElForm>
    <template #footer
      ><ElButton :disabled="saving" @click="close(() => (visible = false))"
        >取消</ElButton
      ><ElButton
        type="primary"
        :loading="saving"
        :disabled="loading || !!error"
        @click="save"
        >保存用户</ElButton
      ></template
    >
  </ElDialog>
</template>
