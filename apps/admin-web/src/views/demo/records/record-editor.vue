<script setup lang="ts">
import { nextTick, reactive, ref, useTemplateRef } from 'vue';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
} from 'element-plus';
import type { FormInstance } from 'element-plus';
import { recordsApi, type RecordItem } from '#/api/demo/records';
const emit = defineEmits<{ saved: [] }>();
const formRef = useTemplateRef<FormInstance>('formRef');
const open = ref(false);
const editing = ref<RecordItem>();
const saving = ref(false);
const formError = ref('');
const createKey = ref('');
const form = reactive({
  code: '',
  name: '',
  status: 'enabled' as 'enabled' | 'disabled',
  remark: '',
});
async function startEdit(item?: RecordItem) {
  formError.value = '';
  createKey.value = crypto.randomUUID();
  try {
    const current = item ? await recordsApi.read(item.id) : undefined;
    editing.value = current;
    Object.assign(form, {
      code: current?.code ?? '',
      name: current?.name ?? '',
      status: current?.status ?? 'enabled',
      remark: current?.remark ?? '',
    });
    open.value = true;
    await nextTick();
    formRef.value?.clearValidate();
  } catch {
    ElMessage.error('无法读取最新记录，请重试');
  }
}
async function save() {
  if (saving.value) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) {
    formRef.value?.$el
      .querySelector('.is-error input, .is-error textarea')
      ?.focus();
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    const original = editing.value;
    if (original) {
      const changes = {
        version: original.version,
        ...(form.name.trim() !== original.name
          ? { name: form.name.trim() }
          : {}),
        ...(form.status !== original.status ? { status: form.status } : {}),
        ...((form.remark.trim() || null) !== original.remark
          ? { remark: form.remark.trim() || null }
          : {}),
      };
      if (Object.keys(changes).length === 1) {
        formError.value = '请先修改至少一个字段';
        return;
      }
      await recordsApi.update(original.id, changes);
    } else
      await recordsApi.create(
        { ...form, name: form.name.trim(), remark: form.remark.trim() || null },
        createKey.value,
      );
    open.value = false;
    ElMessage.success('台账已保存');
    emit('saved');
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'businessCode' in error
        ? error.businessCode
        : '';
    formError.value =
      code === 'VERSION_CONFLICT'
        ? '记录已被修改，当前输入已保留。请复制需要的内容，关闭后重新打开比较。'
        : '保存未确认，输入已保留。网络超时后请先点击“重试原操作”确认结果；不要直接创建第二条。';
  } finally {
    saving.value = false;
  }
}

async function beforeClose(done: () => void) {
  if (saving.value) return;
  const original = editing.value;
  const dirty =
    form.code !== (original?.code ?? '') ||
    form.name !== (original?.name ?? '') ||
    form.status !== (original?.status ?? 'enabled') ||
    form.remark !== (original?.remark ?? '');
  if (dirty) {
    try {
      await ElMessageBox.confirm('未保存的修改将丢失。确定关闭？', '放弃修改', {
        confirmButtonText: '放弃修改',
        cancelButtonText: '继续编辑',
        type: 'warning',
      });
    } catch {
      return;
    }
  }
  done();
}
defineExpose({ startEdit });
</script>
<template>
  <ElDialog
    v-model="open"
    :title="editing ? '编辑设备' : '新增设备'"
    width="min(520px, calc(100vw - 32px))"
    :before-close="beforeClose"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
  >
    <ElAlert
      v-if="formError"
      :title="formError"
      type="error"
      :closable="false"
      class="mb-4"
    />
    <p class="mb-5 text-sm text-muted-foreground">
      编码创建后不可修改；台账状态不控制真实设备。
    </p>
    <ElForm
      ref="formRef"
      :model="form"
      :disabled="saving"
      label-position="top"
      @submit.prevent="save"
    >
      <ElFormItem
        label="设备编码"
        prop="code"
        :rules="[
          {
            required: true,
            pattern: /^[A-Z0-9_-]{2,64}$/,
            message: '请输入 2–64 位大写字母、数字、- 或 _',
            trigger: 'blur',
          },
        ]"
        ><ElInput
          v-model="form.code"
          name="code"
          autocomplete="off"
          :spellcheck="false"
          :disabled="Boolean(editing)"
          maxlength="64"
          placeholder="例如 DEV-0001，创建后不可修改"
      /></ElFormItem>
      <ElFormItem
        label="设备名称"
        prop="name"
        :rules="[
          {
            required: true,
            validator: (_rule, value, callback) =>
              callback(
                typeof value === 'string' &&
                  value.trim().length > 0 &&
                  value.trim().length <= 100
                  ? undefined
                  : new Error('请输入 1–100 字符的设备名称'),
              ),
            trigger: 'blur',
          },
        ]"
        ><ElInput
          v-model="form.name"
          name="name"
          autocomplete="off"
          maxlength="100"
          placeholder="请输入设备名称"
      /></ElFormItem>
      <ElFormItem label="台账状态"
        ><ElSelect v-model="form.status"
          ><ElOption label="启用" value="enabled" /><ElOption
            label="停用"
            value="disabled" /></ElSelect
      ></ElFormItem>
      <ElFormItem label="备注"
        ><ElInput
          v-model="form.remark"
          type="textarea"
          maxlength="500"
          :rows="3"
          show-word-limit
      /></ElFormItem>
    </ElForm>
    <template #footer
      ><ElButton :disabled="saving" @click="beforeClose(() => (open = false))"
        >取消</ElButton
      ><ElButton type="primary" :loading="saving" @click="save">{{
        formError ? '重试原操作' : '保存设备'
      }}</ElButton></template
    >
  </ElDialog>
</template>
