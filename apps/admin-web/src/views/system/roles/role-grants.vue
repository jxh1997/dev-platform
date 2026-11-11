<script setup lang="ts">
import { useUnsavedChanges } from '../use-unsaved-changes';
import { computed, ref } from 'vue';
import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElDialog,
  ElForm,
  ElFormItem,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElMessage,
  ElMessageBox,
} from 'element-plus';
import {
  allOptions,
  systemApi,
  type Grant,
  type ManagedMenu,
  type ManagedRole,
} from '#/api/system';
const emit = defineEmits<{ saved: [] }>();
const visible = ref(false),
  loading = ref(false),
  saving = ref(false),
  error = ref('');
const role = ref<ManagedRole>();
const available = ref<{ code: string; title: string }[]>([]),
  menus = ref<ManagedMenu[]>([]);
const grants = ref<Grant[]>([]),
  menuIds = ref<string[]>([]);
const selected = computed(() => new Set(grants.value.map((g) => g.code)));
const unavailable = computed(() =>
  grants.value.filter((g) => !available.value.some((p) => p.code === g.code)),
);
let initial = '';
useUnsavedChanges(
  () =>
    visible.value && initial !== JSON.stringify([grants.value, menuIds.value]),
  () => saving.value,
);
async function open(value: ManagedRole) {
  role.value = value;
  grants.value = value.permissions.map((g) => ({ ...g }));
  menuIds.value = [...value.menuIds];
  visible.value = true;
  loading.value = true;
  error.value = '';
  initial = JSON.stringify([grants.value, menuIds.value]);
  try {
    const [p, m] = await Promise.all([
      systemApi.permissions(),
      allOptions(systemApi.menus),
    ]);
    available.value = p.filter(
      (p) =>
        !/system:(role|menu|permission):|system:user:assign-role/.test(p.code),
    );
    menus.value = m;
  } catch {
    error.value = '授权选项加载失败，请关闭后重试。';
  } finally {
    loading.value = false;
  }
}
function toggle(code: string, checked: boolean) {
  grants.value = checked
    ? [...grants.value, { code, scope: 'SELF' }]
    : grants.value.filter((g) => g.code !== code);
}
function scope(code: string) {
  return grants.value.find((g) => g.code === code)?.scope ?? 'SELF';
}
function setScope(code: string, value: 'ALL' | 'SELF') {
  const grant = grants.value.find((g) => g.code === code);
  if (grant) grant.scope = value;
}
async function close(done: () => void) {
  if (saving.value) return;
  if (initial !== JSON.stringify([grants.value, menuIds.value])) {
    try {
      await ElMessageBox.confirm('未保存的授权变更将丢失。', '放弃修改？', {
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
  if (!role.value || saving.value || loading.value || error.value) return;
  saving.value = true;
  try {
    await systemApi.grantRole(role.value.id, {
      version: role.value.version,
      permissions: grants.value,
      menuIds: menuIds.value,
    });
    visible.value = false;
    ElMessage.success('角色授权已保存，后续请求按新权限执行');
    emit('saved');
  } catch {
    /* 保留输入，冲突必须重新加载 */
  } finally {
    saving.value = false;
  }
}
defineExpose({ open });
</script>
<template>
  <ElDialog
    v-model="visible"
    :title="`角色授权 · ${role?.name ?? ''}`"
    width="800px"
    :before-close="close"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
  >
    <ElAlert
      title="导航与接口权限分别配置。勾选菜单不会自动授予操作；进入页面还需相应的查看权限。"
      type="info"
      :closable="false"
      class="mb-4"
    />
    <ElAlert v-if="error" :title="error" type="error" :closable="false" />
    <ElAlert
      v-if="unavailable.length"
      title="包含已停用或不可授予权限，请重新加载角色并联系维护者核对。"
      type="warning"
      :closable="false"
    />
    <ElForm label-position="top"
      ><ElFormItem label="导航分配（全量替换）"
        ><ElSelect
          v-model="menuIds"
          multiple
          filterable
          aria-label="导航分配"
          :loading="loading"
          style="width: 100%"
          ><ElOption
            v-for="m in menus"
            :key="m.id"
            :label="`${m.title}${m.enabled ? '' : '（已停用）'}`"
            :value="m.id" /></ElSelect></ElFormItem
    ></ElForm>
    <h3 class="mb-2 font-semibold">
      操作权限与范围 · 已选 {{ grants.length }} 项
    </h3>
    <ElTable
      v-loading="loading"
      :data="available"
      max-height="360"
      empty-text="暂无可授予权限"
    >
      <ElTableColumn label="授予" width="70"
        ><template #default="{ row }"
          ><ElCheckbox
            :model-value="selected.has(row.code)"
            :aria-label="`授予 ${row.code}`"
            @change="(value) => toggle(row.code, !!value)" /></template
      ></ElTableColumn>
      <ElTableColumn prop="title" label="操作" min-width="180" /><ElTableColumn
        prop="code"
        label="权限码"
        min-width="210"
      />
      <ElTableColumn label="数据范围" width="130"
        ><template #default="{ row }"
          ><ElSelect
            :model-value="scope(row.code)"
            :disabled="!selected.has(row.code)"
            :aria-label="`${row.code} 数据范围`"
            @change="(value) => setScope(row.code, value)"
            ><ElOption label="本人" value="SELF" /><ElOption
              label="全部"
              value="ALL" /></ElSelect></template
      ></ElTableColumn>
    </ElTable>
    <template #footer
      ><ElButton :disabled="saving" @click="close(() => (visible = false))"
        >取消</ElButton
      ><ElButton
        type="primary"
        :loading="saving"
        :disabled="loading || !!error || !!unavailable.length"
        @click="save"
        >保存授权</ElButton
      ></template
    >
  </ElDialog>
</template>
