<script lang="ts" setup>
import { useSimpleLocale } from '@vben-core/composables';
import { RotateCw } from '@vben-core/icons';

const { currentLocale } = useSimpleLocale();

const emit = defineEmits(['refresh']);

const handleRefresh = () => {
  emit('refresh');
};
</script>

<template>
  <button
    type="button"
    :aria-label="
      currentLocale === 'zh-CN' ? '刷新当前标签' : 'Refresh current tab'
    "
    class="flex-center h-full cursor-pointer border-l border-border px-2 text-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
    @click="handleRefresh"
  >
    <RotateCw class="size-4" />
  </button>
</template>
