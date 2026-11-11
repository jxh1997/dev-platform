<script setup lang="ts">
import { useUnsavedChanges } from '../use-unsaved-changes';
import { reactive, ref, useTemplateRef } from 'vue';
import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElSwitch,
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from 'element-plus';
import { systemApi, type ManagedRole } from '#/api/system';
const emit = defineEmits<{ saved: [] }>();
const visible = ref(false),
  saving = ref(false),
  current = ref<ManagedRole>();
const draft = reactive({ code: '', name: '', enabled: true });
const form = useTemplateRef<FormInstance>('form');
const rules: FormRules = {
  code: [
    {
      required: true,
      pattern: /^[a-z][a-z0-9_-]{2,63}$/,
      message: '编码为 3–64 位小写字母、数字、横线或下划线，以字母开头',
      trigger: 'blur',
    },
  ],
  name: [
    {
      required: true,
      min: 1,
      max: 100,
      message: '请输入 1–100 位角色名称',
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
function open(role?: ManagedRole) {
  creationKey = crypto.randomUUID();
  current.value = role;
  Object.assign(draft, {
    code: role?.code ?? '',
    name: role?.name ?? '',
    enabled: role?.enabled ?? true,
  });
  initial = JSON.stringify(draft);
  visible.value = true;
}
async function close(done: () => void) {
  if (saving.value) return;
  if (initial !== JSON.stringify(draft)) {
    try {
      await ElMessageBox.confirm('未保存的角色修改将丢失。', '放弃修改？', {
        confirmButtonText: '放弃修改',
        cancelButtonText: '继续编辑',
      });
    } catch {
      return;
    }
  }
  done();
}
async function save() {
  if (saving.value) return;
  if (!(await form.value?.validate().catch(() => false))) {
    form.value?.$el.querySelector('.is-error input')?.focus();
    return;
  }
  saving.value = true;
  try {
    if (current.value)
      await systemApi.updateRole(current.value.id, {
        version: current.value.version,
        name: draft.name,
        enabled: draft.enabled,
      });
    else
      await systemApi.createRole(
        { code: draft.code, name: draft.name },
        creationKey,
      );
    visible.value = false;
    ElMessage.success('角色已保存');
    emit('saved');
  } catch {
    /* 统一错误提示 */
  } finally {
    saving.value = false;
  }
}
defineExpose({ open });
</script>
<template>
  <ElDialog
    v-model="visible"
    :title="current ? '编辑角色' : '新增角色'"
    width="540px"
    :before-close="close"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    @closed="form?.clearValidate()"
    ><ElForm
      ref="form"
      :model="draft"
      :rules="rules"
      label-position="top"
      @submit.prevent="save"
      ><ElFormItem label="角色编码" prop="code"
        ><ElInput
          v-model="draft.code"
          :disabled="!!current"
          autocomplete="off"
          :spellcheck="false" /></ElFormItem
      ><ElFormItem label="角色名称" prop="name"
        ><ElInput
          v-model="draft.name"
          maxlength="100"
          autocomplete="off" /></ElFormItem
      ><ElFormItem v-if="current" label="角色状态"
        ><ElSwitch
          v-model="draft.enabled"
          active-text="启用"
          inactive-text="停用" /></ElFormItem></ElForm
    ><template #footer
      ><ElButton :disabled="saving" @click="close(() => (visible = false))"
        >取消</ElButton
      ><ElButton type="primary" :loading="saving" @click="save"
        >保存角色</ElButton
      ></template
    ></ElDialog
  >
</template>
