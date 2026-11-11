<script lang="ts" setup>
import { useSimpleLocale } from '@vben-core/composables';
import { Fullscreen, Minimize2 } from '@vben-core/icons';

const { currentLocale } = useSimpleLocale();

const screen = defineModel<boolean>('screen');

function toggleScreen() {
  screen.value = !screen.value;
}
</script>

<template>
  <button
    type="button"
    :aria-label="
      screen
        ? currentLocale === 'zh-CN'
          ? '还原内容'
          : 'Restore content'
        : currentLocale === 'zh-CN'
          ? '内容最大化'
          : 'Maximize content'
    "
    class="flex-center h-full cursor-pointer border-l border-border px-2 text-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
    @click="toggleScreen"
  >
    <Minimize2 v-if="screen" class="size-4" />
    <Fullscreen v-else class="size-4" />
  </button>
</template>
