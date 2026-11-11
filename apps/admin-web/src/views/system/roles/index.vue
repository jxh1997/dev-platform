<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { Page } from '@vben/common-ui';
import {
  ElAlert,
  ElButton,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
  ElMessage,
  ElMessageBox,
} from 'element-plus';
import { systemApi, type ManagedRole } from '#/api/system';
import { useSystemList } from '../use-system-list';
import RoleEditor from './role-editor.vue';
import RoleGrants from './role-grants.vue';
const { items, total, loading, error, query, load } = useSystemList(
  systemApi.roles,
);
const editor = useTemplateRef<InstanceType<typeof RoleEditor>>('editor'),
  grants = useTemplateRef<InstanceType<typeof RoleGrants>>('grants');
const pending = ref('');
async function remove(role: ManagedRole) {
  try {
    await ElMessageBox.confirm(
      `删除「${role.name}」？有关联用户时无法删除。`,
      '确认删除角色',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  pending.value = role.id;
  try {
    await systemApi.deleteRole(role.id, role.version);
    ElMessage.success('角色已删除');
    await load();
  } catch {
    /* 统一错误提示 */
  } finally {
    pending.value = '';
  }
}
</script>
<template>
  <Page
    ><header class="system-heading">
      <div>
        <h1 class="system-title">角色管理</h1>
        <p class="system-description">
          按操作分配权限与范围，多个有效角色的授权取并集。
        </p>
      </div>
      <ElButton type="primary" @click="editor?.open()">新增角色</ElButton>
    </header>
    <ElAlert
      v-if="error"
      class="system-alert"
      :title="error"
      type="error"
      :closable="false"
      ><ElButton @click="load()">重试</ElButton></ElAlert
    >
    <section class="system-panel" aria-label="角色列表">
      <form class="system-toolbar" @submit.prevent="load(true)">
        <label for="role-search">编码或名称</label
        ><ElInput
          id="role-search"
          v-model="query.search"
          class="system-search"
          maxlength="100"
          clearable
        /><ElButton native-type="submit" :loading="loading">查询</ElButton>
      </form>
      <ElTable
        v-loading="loading"
        :data="error ? [] : items"
        empty-text="暂无符合条件的角色"
        ><ElTableColumn
          prop="code"
          label="编码"
          min-width="160"
          show-overflow-tooltip
        /><ElTableColumn
          prop="name"
          label="名称"
          min-width="160"
          show-overflow-tooltip
        /><ElTableColumn label="状态" width="100"
          ><template #default="{ row }"
            ><ElTag :type="row.enabled ? 'success' : 'info'">{{
              row.enabled ? '启用' : '停用'
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="授权" min-width="140"
          ><template #default="{ row }"
            >{{ row.permissions.length }} 项操作 ·
            {{ row.menuIds.length }} 项导航</template
          ></ElTableColumn
        ><ElTableColumn label="操作" min-width="210"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="editor?.open(row)"
              >编辑</ElButton
            ><ElButton
              v-if="!row.isSuperAdmin"
              link
              type="primary"
              @click="grants?.open(row)"
              >授权</ElButton
            ><ElButton
              v-if="!row.isSuperAdmin"
              link
              type="danger"
              :disabled="!!pending"
              :loading="pending === row.id"
              @click="remove(row)"
              >删除</ElButton
            ><span v-else class="text-xs text-muted-foreground"
              >系统保护</span
            ></template
          ></ElTableColumn
        ></ElTable
      >
      <div class="system-pagination">
        <ElPagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @change="load()"
        />
      </div>
    </section>
    <RoleEditor ref="editor" @saved="load()" /><RoleGrants
      ref="grants"
      @saved="load()"
  /></Page>
</template>
<style scoped src="../system.css"></style>
