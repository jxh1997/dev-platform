<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Maximize, Minimize } from '@vben-core/icons';
import { useSimpleLocale } from '@vben-core/composables';
import { useFullscreen } from '@vueuse/core';
import { VbenIconButton } from '../button';
defineOptions({ name: 'FullScreen' });
const { isFullscreen, isSupported, toggle } = useFullscreen();
const { currentLocale } = useSimpleLocale();
const failed = ref(false);
const label = computed(() => {
  const zh = currentLocale.value === 'zh-CN';
  if (!isSupported.value)
    return zh ? '当前浏览器不支持全屏' : 'Fullscreen is unavailable';
  if (failed.value)
    return zh
      ? '未能切换全屏，请检查浏览器权限后重试'
      : 'Unable to toggle fullscreen; check browser permissions';
  return isFullscreen.value
    ? zh
      ? '退出全屏'
      : 'Exit fullscreen'
    : zh
      ? '全屏'
      : 'Fullscreen';
});
async function toggleScreen() {
  failed.value = false;
  try {
    await toggle();
  } catch {
    failed.value = true;
  }
}
</script>
<template>
  <VbenIconButton
    :aria-label="label"
    :tooltip="label"
    :disabled="!isSupported"
    @click="toggleScreen"
  >
    <Minimize v-if="isFullscreen" class="text-foreground size-4" />
    <Maximize v-else class="text-foreground size-4" />
    <span v-if="failed" role="alert" class="sr-only">{{ label }}</span>
  </VbenIconButton>
</template>
