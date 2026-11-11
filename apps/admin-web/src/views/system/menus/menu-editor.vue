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
  ElInputNumber,
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
  type ManagedMenu,
  type MenuInput,
  type PageComponent,
} from '#/api/system';
const emit = defineEmits<{ saved: [] }>();
const visible = ref(false),
  saving = ref(false),
  loading = ref(false),
  error = ref(''),
  current = ref<ManagedMenu>();
const draft = reactive<MenuInput>({
  code: '',
  name: '',
  path: '',
  title: '',
  icon: 'lucide:folder',
  component: '',
  permission: '',
  parentId: null,
  type: 'page',
  sort: 0,
  visible: true,
  enabled: true,
});
const menus = ref<ManagedMenu[]>([]),
  pages = ref<PageComponent[]>([]),
  permissions = ref<{ code: string; title: string }[]>([]);
const parents = computed(() =>
  menus.value.filter(
    (m) => m.type === 'directory' && m.id !== current.value?.id,
  ),
);
const form = useTemplateRef<FormInstance>('form');
const rules: FormRules = {
  code: [
    {
      required: true,
      pattern: /^[a-z][a-z0-9_-]{2,63}$/,
      message: '编码须为 3–64 位小写字母、数字、横线或下划线',
      trigger: 'blur',
    },
  ],
  name: [
    {
      required: true,
      pattern: /^[A-Za-z][A-Za-z0-9_]{0,99}$/,
      message: '路由名须以字母开头，仅含字母、数字或下划线',
      trigger: 'blur',
    },
  ],
  title: [
    {
      required: true,
      min: 1,
      max: 100,
      message: '请输入 1–100 位标题',
      trigger: 'blur',
    },
  ],
  path: [
    {
      required: true,
      max: 250,
      message: '请输入不超过 250 位的路径',
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
async function open(menu?: ManagedMenu) {
  creationKey = crypto.randomUUID();
  current.value = menu;
  Object.assign(draft, {
    code: menu?.code ?? '',
    name: menu?.name ?? '',
    path: menu?.path ?? '',
    title: menu?.title ?? '',
    icon: menu?.icon ?? 'lucide:folder',
    component: menu?.component ?? '',
    permission: menu?.permission ?? '',
    parentId: menu?.parentId ?? null,
    type: menu?.type ?? 'page',
    sort: menu?.sort ?? 0,
    visible: menu?.visible ?? true,
    enabled: menu?.enabled ?? true,
  });
  initial = JSON.stringify(draft);
  visible.value = true;
  loading.value = true;
  error.value = '';
  try {
    [menus.value, pages.value, permissions.value] = await Promise.all([
      allOptions(systemApi.menus),
      systemApi.components(),
      systemApi.permissions(),
    ]);
  } catch {
    error.value = '菜单选项加载失败，请关闭后重试。';
  } finally {
    loading.value = false;
  }
}
function selectPage(component: string) {
  const p = pages.value.find((p) => p.component === component);
  if (p) {
    draft.path = p.path;
    draft.permission = p.permission;
  }
}
function selectType() {
  draft.component = '';
  draft.permission = '';
  draft.path = '';
}
async function close(done: () => void) {
  if (saving.value) return;
  if (initial !== JSON.stringify(draft)) {
    try {
      await ElMessageBox.confirm('未保存的菜单修改将丢失。', '放弃修改？', {
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
  if (saving.value || loading.value || error.value) return;
  if (!(await form.value?.validate().catch(() => false))) {
    form.value?.$el.querySelector('.is-error input')?.focus();
    return;
  }
  saving.value = true;
  try {
    if (current.value) {
      const { code: _code, ...fields } = draft;
      await systemApi.updateMenu(current.value.id, {
        ...fields,
        version: current.value.version,
      });
    } else await systemApi.createMenu({ ...draft }, creationKey);
    visible.value = false;
    ElMessage.success('菜单已保存，重新加载后更新导航');
    emit('saved');
  } catch {
    /* 保留输入，不自动覆盖版本 */
  } finally {
    saving.value = false;
  }
}
defineExpose({ open });
</script>
<template>
  <ElDialog
    v-model="visible"
    :title="current ? '编辑菜单' : '新增菜单'"
    width="600px"
    :before-close="close"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    @closed="form?.clearValidate()"
    ><ElAlert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
    /><ElForm
      ref="form"
      :model="draft"
      :rules="rules"
      label-position="top"
      @submit.prevent="save"
    >
      <ElFormItem label="菜单编码" prop="code"
        ><ElInput
          v-model="draft.code"
          :disabled="!!current"
          autocomplete="off"
          :spellcheck="false"
      /></ElFormItem>
      <ElFormItem label="标题" prop="title"
        ><ElInput v-model="draft.title" maxlength="100" autocomplete="off"
      /></ElFormItem>
      <ElFormItem label="类型"
        ><ElSelect
          v-model="draft.type"
          aria-label="菜单类型"
          @change="selectType"
          ><ElOption label="目录" value="directory" /><ElOption
            label="页面"
            value="page" /><ElOption label="按钮" value="button" /><ElOption
            label="HTTPS 外链"
            value="link" /></ElSelect
      ></ElFormItem>
      <ElFormItem label="父目录"
        ><ElSelect
          v-model="draft.parentId"
          clearable
          :value-on-clear="null"
          :loading="loading"
          aria-label="父目录"
          style="width: 100%"
          ><ElOption
            v-for="m in parents"
            :key="m.id"
            :value="m.id"
            :label="m.title" /></ElSelect
      ></ElFormItem>
      <ElFormItem label="图标标识"
        ><ElInput
          v-model="draft.icon"
          autocomplete="off"
          placeholder="例如 lucide:folder"
      /></ElFormItem>
      <ElFormItem label="路由名" prop="name"
        ><ElInput v-model="draft.name" autocomplete="off" :spellcheck="false"
      /></ElFormItem>
      <ElFormItem v-if="draft.type === 'page'" label="已发布页面"
        ><ElSelect
          v-model="draft.component"
          aria-label="页面组件"
          style="width: 100%"
          @change="selectPage"
          ><ElOption
            v-for="p in pages"
            :key="p.component"
            :value="p.component"
            :label="p.component" /></ElSelect
      ></ElFormItem>
      <ElFormItem label="路径" prop="path"
        ><ElInput
          v-model="draft.path"
          :readonly="draft.type === 'page'"
          autocomplete="off"
      /></ElFormItem>
      <ElFormItem v-if="draft.type !== 'directory'" label="进入或按钮权限"
        ><ElSelect
          v-model="draft.permission"
          filterable
          :disabled="draft.type === 'page'"
          aria-label="菜单权限"
          style="width: 100%"
          ><ElOption
            v-for="p in permissions"
            :key="p.code"
            :value="p.code"
            :label="p.code" /></ElSelect
      ></ElFormItem>
      <ElFormItem label="排序"
        ><ElInputNumber
          v-model="draft.sort"
          :min="0"
          :max="10000"
          :precision="0"
      /></ElFormItem>
      <ElFormItem label="导航显示"
        ><ElSwitch
          v-model="draft.visible"
          active-text="显示"
          inactive-text="隐藏" /></ElFormItem
      ><ElFormItem label="菜单状态"
        ><ElSwitch
          v-model="draft.enabled"
          active-text="启用"
          inactive-text="停用"
      /></ElFormItem>
      <p class="text-sm text-muted-foreground">
        隐藏仅影响导航显示；停用影响页面入口。接口访问始终按操作权限校验。
      </p> </ElForm
    ><template #footer
      ><ElButton :disabled="saving" @click="close(() => (visible = false))"
        >取消</ElButton
      ><ElButton
        type="primary"
        :loading="saving"
        :disabled="loading || !!error"
        @click="save"
        >保存菜单</ElButton
      ></template
    ></ElDialog
  >
</template>
