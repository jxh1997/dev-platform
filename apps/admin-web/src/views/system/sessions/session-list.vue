<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import {
  ElAlert,
  ElButton,
  ElTable,
  ElTableColumn,
  ElMessageBox,
  ElMessage,
} from 'element-plus';
import { systemApi, type SessionItem } from '#/api/system';
import { useAuthStore } from '#/store';
const props = withDefaults(
  defineProps<{ userId?: string; canRevoke?: boolean }>(),
  { canRevoke: true },
);
const auth = useAuthStore();
const rows = ref<SessionItem[]>([]),
  loading = ref(false),
  error = ref(''),
  pending = ref('');
let sequence = 0;
async function load() {
  const request = ++sequence;
  loading.value = true;
  error.value = '';
  try {
    const data = await systemApi.sessions(props.userId);
    if (request === sequence) rows.value = data;
  } catch {
    if (request === sequence) error.value = '会话加载失败，请重试。';
  } finally {
    if (request === sequence) loading.value = false;
  }
}
async function revoke(row: SessionItem) {
  try {
    await ElMessageBox.confirm(
      row.current
        ? '撤销当前会话后需要重新登录。'
        : '该会话将立即失效，无法继续续期。',
      '确认撤销会话',
      {
        confirmButtonText: '确认撤销',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  pending.value = row.id;
  try {
    await systemApi.revokeSession(row.id, props.userId);
    ElMessage.success('会话已撤销');
    if (row.current) await auth.logout(false);
    else await load();
  } catch {
    /* 统一错误提示 */
  } finally {
    pending.value = '';
  }
}
watch(() => props.userId, load);
onMounted(load);
onUnmounted(() => sequence++);
const time = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  });
</script>
<template>
  <p class="mb-4 text-sm text-muted-foreground">
    显示最近 100 个会话，时间为北京时间。刷新凭据不会显示或返回。
  </p>
  <ElAlert v-if="error" :title="error" type="error" :closable="false"
    ><ElButton @click="load">重试</ElButton></ElAlert
  >
  <ElTable v-loading="loading" :data="error ? [] : rows" empty-text="暂无会话">
    <ElTableColumn label="会话" min-width="170"
      ><template #default="{ row }"
        >{{ row.current ? '当前会话' : '其他会话' }} ·
        {{ row.id.slice(0, 8) }}</template
      ></ElTableColumn
    >
    <ElTableColumn label="到期时间" min-width="180"
      ><template #default="{ row }">{{
        time(row.expiresAt)
      }}</template></ElTableColumn
    >
    <ElTableColumn label="状态" min-width="120"
      ><template #default="{ row }">{{
        row.revokedAt
          ? '已撤销'
          : new Date(row.expiresAt).getTime() <= Date.now()
            ? '已到期'
            : '有效'
      }}</template></ElTableColumn
    >
    <ElTableColumn v-if="canRevoke !== false" label="操作" width="100"
      ><template #default="{ row }"
        ><ElButton
          v-if="
            !row.revokedAt && new Date(row.expiresAt).getTime() > Date.now()
          "
          type="danger"
          link
          :loading="pending === row.id"
          :disabled="!!pending"
          @click="revoke(row)"
          >撤销</ElButton
        ></template
      ></ElTableColumn
    >
  </ElTable>
</template>
