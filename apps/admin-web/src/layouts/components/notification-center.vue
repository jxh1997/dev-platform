<script setup lang="ts">
import { ref } from 'vue';
import { Notification } from '@vben/layouts';
import { ElDrawer, ElEmpty } from 'element-plus';
const open = ref(false);
</script>
<template>
  <Notification :notifications="[]" :dot="false" @view-all="open = true" />
  <ElDrawer
    v-model="open"
    title="消息中心"
    size="min(460px, 100vw)"
    destroy-on-close
  >
    <ElEmpty description="暂无站内消息" />
    <p class="text-center text-sm text-muted-foreground">
      收到的站内通知将在这里集中展示。
    </p>
  </ElDrawer>
</template>
