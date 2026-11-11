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
  ElMessageBox,
  ElMessage,
} from 'element-plus';
import { systemApi, type ManagedMenu } from '#/api/system';
import { useSystemList } from '../use-system-list';
import MenuEditor from './menu-editor.vue';
const { items, total, loading, error, query, load } = useSystemList(
  systemApi.menus,
);
const editor = useTemplateRef<InstanceType<typeof MenuEditor>>('editor');
const pending = ref('');
const labels = {
  page: '页面',
  directory: '目录',
  button: '按钮',
  link: '外链',
};
async function remove(menu: ManagedMenu) {
  try {
    await ElMessageBox.confirm(
      `删除「${menu.title}」？存在子节点或角色引用时无法删除。`,
      '确认删除菜单',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  pending.value = menu.id;
  try {
    await systemApi.deleteMenu(menu.id, menu.version);
    ElMessage.success('菜单已删除');
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
        <h1 class="system-title">菜单管理</h1>
        <p class="system-description">
          配置导航与已发布页面映射，菜单不会创造接口权限。
        </p>
      </div>
      <ElButton type="primary" @click="editor?.open()">新增菜单</ElButton>
    </header>
    <ElAlert
      v-if="error"
      class="system-alert"
      :title="error"
      type="error"
      :closable="false"
      ><ElButton @click="load()">重试</ElButton></ElAlert
    >
    <section class="system-panel" aria-label="菜单列表">
      <form class="system-toolbar" @submit.prevent="load(true)">
        <label for="menu-search">编码或标题</label
        ><ElInput
          id="menu-search"
          v-model="query.search"
          class="system-search"
          maxlength="100"
          clearable
        /><ElButton native-type="submit" :loading="loading">查询</ElButton>
      </form>
      <ElTable
        v-loading="loading"
        :data="error ? [] : items"
        empty-text="暂无符合条件的菜单"
        ><ElTableColumn
          prop="title"
          label="标题"
          min-width="160"
          show-overflow-tooltip
        /><ElTableColumn
          prop="code"
          label="编码"
          min-width="120"
          show-overflow-tooltip
        /><ElTableColumn label="类型" width="90"
          ><template #default="{ row }">{{
            labels[row.type as keyof typeof labels]
          }}</template></ElTableColumn
        ><ElTableColumn
          prop="path"
          label="路径"
          min-width="180"
          show-overflow-tooltip
        /><ElTableColumn label="导航状态" width="130"
          ><template #default="{ row }">{{
            !row.enabled ? '停用' : row.visible ? '显示' : '隐藏'
          }}</template></ElTableColumn
        ><ElTableColumn label="操作" width="150"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="editor?.open(row)"
              >编辑</ElButton
            ><ElButton
              link
              type="danger"
              :loading="pending === row.id"
              :disabled="!!pending"
              @click="remove(row)"
              >删除</ElButton
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
    <MenuEditor ref="editor" @saved="load()"
  /></Page>
</template>
<style scoped src="../system.css"></style>
