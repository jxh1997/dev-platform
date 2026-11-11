<script setup lang="ts">
import { Page } from '@vben/common-ui';
import SessionList from './session-list.vue';
</script>
<template>
  <Page
    ><header class="system-heading">
      <div>
        <h1 class="system-title">我的会话</h1>
        <p class="system-description">查看登录会话，撤销不再使用的会话。</p>
      </div>
    </header>
    <section class="system-panel p-5"><SessionList /></section
  ></Page>
</template>
<style scoped src="../system.css"></style>
