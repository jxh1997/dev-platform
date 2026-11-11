<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { Page } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';
import { systemApi, type ManagedUser } from '#/api/system';
import { useSystemList } from '../use-system-list';
import UserEditor from './user-editor.vue';
import SessionList from '../sessions/session-list.vue';
const { items, total, loading, error, query, load } = useSystemList(
  systemApi.users,
);
const access = useAccessStore(),
  userStore = useUserStore();
const allowed = (action: string) =>
  access.accessCodes.includes(`system:user:${action}`);
const superAdmin = () => userStore.userInfo?.isSuperAdmin === true;
const editor = useTemplateRef<InstanceType<typeof UserEditor>>('editor');
const sessionUser = ref<ManagedUser>();
const sessionOpen = ref(false);
function sessions(user: ManagedUser) {
  sessionUser.value = user;
  sessionOpen.value = true;
}
</script>
<template>
  <Page>
    <header class="system-heading">
      <div>
        <h1 class="system-title">用户管理</h1>
        <p class="system-description">
          维护账号与角色。禁用账号或重置密码后，原会话立即失效。
        </p>
      </div>
      <ElButton
        v-if="allowed('create')"
        type="primary"
        @click="editor?.open('create')"
        >新增用户</ElButton
      >
    </header>
    <ElAlert
      v-if="error"
      class="system-alert"
      :title="error"
      type="error"
      :closable="false"
      ><ElButton @click="load()">重试</ElButton></ElAlert
    >
    <section class="system-panel" aria-label="用户列表">
      <form class="system-toolbar" @submit.prevent="load(true)">
        <label for="user-search">账号或姓名</label
        ><ElInput
          id="user-search"
          v-model="query.search"
          class="system-search"
          maxlength="100"
          clearable
        /><ElButton native-type="submit" :loading="loading">查询</ElButton>
      </form>
      <ElTable
        v-loading="loading"
        :data="error ? [] : items"
        empty-text="暂无符合条件的用户"
      >
        <ElTableColumn
          prop="username"
          label="账号"
          min-width="150"
          show-overflow-tooltip
        /><ElTableColumn
          prop="realName"
          label="姓名"
          min-width="150"
          show-overflow-tooltip
        />
        <ElTableColumn label="状态" width="100"
          ><template #default="{ row }"
            ><ElTag :type="row.enabled ? 'success' : 'info'">{{
              row.enabled ? '启用' : '禁用'
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="安全状态" min-width="140"
          ><template #default="{ row }">{{
            row.isSuperAdmin
              ? '超级管理员'
              : row.mustChangePassword
                ? '待首次改密'
                : '普通账号'
          }}</template></ElTableColumn
        >
        <ElTableColumn label="操作" width="260" fixed="right"
          ><template #default="{ row }"
            ><div class="system-actions">
              <ElButton
                v-if="allowed('update')"
                link
                type="primary"
                @click="editor?.open('edit', row)"
                >编辑</ElButton
              ><ElButton
                v-if="allowed('assign-role') && superAdmin()"
                link
                type="primary"
                @click="editor?.open('roles', row)"
                >分配角色</ElButton
              ><ElButton v-if="allowed('sessions')" link @click="sessions(row)"
                >会话</ElButton
              ><ElButton
                v-if="allowed('reset-password')"
                link
                type="danger"
                @click="editor?.open('reset', row)"
                >重置密码</ElButton
              >
            </div></template
          ></ElTableColumn
        >
      </ElTable>
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
    <UserEditor ref="editor" @saved="load()" />
    <ElDialog
      v-model="sessionOpen"
      :title="`${sessionUser?.username ?? ''} 的会话`"
      width="800px"
      destroy-on-close
      ><SessionList
        v-if="sessionOpen && sessionUser"
        :user-id="sessionUser.id"
        :can-revoke="allowed('revoke-session')"
    /></ElDialog>
  </Page>
</template>
<style scoped src="../system.css"></style>
