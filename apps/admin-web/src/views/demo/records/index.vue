<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, useTemplateRef } from 'vue';
import { Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';
import { preferences } from '@vben/preferences';
import {
  ElAlert,
  ElButton,
  ElEmpty,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';
import { recordsApi, type RecordItem } from '#/api/demo/records';
import RecordEditor from './record-editor.vue';
const editor = useTemplateRef<InstanceType<typeof RecordEditor>>('editor');
const access = useAccessStore();
const allowed = (action: string) =>
  access.accessCodes.includes(`demo:record:${action}`);
const items = ref<RecordItem[]>([]);
const total = ref(0);
const query = reactive({ page: 1, pageSize: 20, name: '' });
const loading = ref(false);
const loadError = ref('');
let sequence = 0;
async function load() {
  const request = ++sequence;
  loading.value = true;
  loadError.value = '';
  try {
    const result = await recordsApi.list({
      ...query,
      name: query.name || undefined,
    });
    if (request === sequence) {
      items.value = result.list;
      total.value = result.total;
    }
  } catch {
    if (request === sequence)
      loadError.value = '台账加载失败。请检查服务连接后重试。';
  } finally {
    if (request === sequence) loading.value = false;
  }
}
async function remove(item: RecordItem) {
  try {
    await ElMessageBox.confirm(
      `删除「${item.name}」后将从有效台账中移除，编码仍不可复用。`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      },
    );
  } catch {
    return;
  }
  try {
    await recordsApi.remove(item.id, item.version);
    ElMessage.success('已删除');
    await load();
  } catch {
    /* 统一请求层反馈；不自动覆盖 version 重试。 */
  }
}
onMounted(load);
onUnmounted(() => {
  sequence++;
});
</script>
<template>
  <Page>
    <header class="record-heading">
      <div>
        <h1 class="page-title">设备台账</h1>
        <p class="description">维护设备基本信息与台账状态</p>
      </div>
      <ElButton
        v-if="allowed('create')"
        type="primary"
        @click="editor?.startEdit()"
        >新增设备</ElButton
      >
    </header>
    <section class="registry-panel" aria-label="设备记录">
      <form
        class="search"
        @submit.prevent="
          query.page = 1;
          load();
        "
      >
        <label for="device-search">设备名称</label>
        <ElInput
          id="device-search"
          v-model="query.name"
          name="device-search"
          autocomplete="off"
          placeholder="搜索设备名称"
          clearable
        />
        <ElButton native-type="submit" type="primary" plain :loading="loading"
          >查询</ElButton
        >
        <ElButton
          :disabled="loading"
          @click="
            query.name = '';
            query.page = 1;
            load();
          "
          >重置</ElButton
        >
      </form>
      <div class="table-heading">
        <h2>
          设备记录 <span v-if="!loadError">{{ total }}</span>
        </h2>
        <span>状态仅用于台账管理</span>
      </div>
      <ElAlert
        v-if="loadError"
        :title="loadError"
        type="error"
        :closable="false"
        show-icon
      /><ElButton v-if="loadError" class="my-4" @click="load"
        >重试加载</ElButton
      >
      <ElTable
        v-else
        v-loading="loading"
        :data="items"
        row-key="id"
        :aria-busy="loading"
        :header-cell-style="{ background: 'hsl(var(--muted) / .45)' }"
        style="width: 100%"
      >
        <template #empty
          ><ElEmpty description="暂无设备记录，可新增设备或调整筛选"
        /></template>
        <ElTableColumn
          prop="code"
          class-name="record-code"
          show-overflow-tooltip
          label="设备编码"
          min-width="150"
        /><ElTableColumn
          prop="name"
          label="设备名称"
          min-width="180"
          show-overflow-tooltip
        />
        <ElTableColumn label="状态" width="100"
          ><template #default="{ row }"
            ><ElTag
              :type="row.status === 'enabled' ? 'success' : 'info'"
              effect="plain"
              >{{ row.status === 'enabled' ? '启用' : '停用' }}</ElTag
            ></template
          ></ElTableColumn
        >
        <ElTableColumn
          prop="remark"
          label="备注"
          min-width="180"
          show-overflow-tooltip
        /><ElTableColumn prop="version" label="版本" width="70" align="right" />
        <ElTableColumn label="更新时间" min-width="190"
          ><template #default="{ row }">{{
            new Date(row.updatedAt).toLocaleString('zh-CN', {
              hour12: false,
              timeZone: preferences.app.timezone,
            })
          }}</template></ElTableColumn
        >
        <ElTableColumn label="操作" width="140" fixed="right"
          ><template #default="{ row }"
            ><ElButton
              v-if="allowed('read') && allowed('update')"
              link
              type="primary"
              @click="editor?.startEdit(row)"
              >编辑</ElButton
            ><ElButton
              v-if="allowed('delete')"
              link
              type="danger"
              @click="remove(row)"
              >删除</ElButton
            ></template
          ></ElTableColumn
        >
      </ElTable>
      <div class="pagination">
        <ElPagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @change="load"
        />
      </div>
    </section>
    <RecordEditor ref="editor" @saved="load" />
  </Page>
</template>
<style scoped>
.record-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 8px 0 22px;
}
.page-title {
  font-size: 22px;
  line-height: 1.4;
  font-weight: 650;
  letter-spacing: -0.4px;
}
.description {
  color: hsl(var(--muted-foreground));
  margin-top: 6px;
  font-size: 13px;
}
.registry-panel {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  overflow: hidden;
}
.search {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid hsl(var(--border));
}
.search label {
  font-size: 13px;
  flex-shrink: 0;
}
.search .el-input {
  width: 280px;
}
.table-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
}
.table-heading h2 {
  font-size: 14px;
  font-weight: 600;
}
.table-heading h2 span {
  margin-left: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  font-variant-numeric: tabular-nums;
  font-weight: 400;
}
.table-heading > span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}
.registry-panel :deep(.el-table) {
  --el-table-cell-padding: 14px 0;
}
.registry-panel :deep(.record-code) {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 12px;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 18px 24px;
  overflow-x: auto;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 850px) {
  .search {
    flex-wrap: wrap;
    gap: 10px;
    padding: 16px;
  }
  .search .el-input {
    width: auto;
    flex: 1;
    min-width: 160px;
  }
  .table-heading {
    padding: 16px;
  }
  .pagination {
    justify-content: flex-start;
    padding: 16px;
  }
}
</style>
