<script lang="ts" setup>
import { useSimpleLocale } from '@vben-core/composables';
import type { DropdownMenuProps } from '@vben-core/shadcn-ui';

import { LayoutGrid } from '@vben-core/icons';
import { VbenDropdownMenu } from '@vben-core/shadcn-ui';

const { currentLocale } = useSimpleLocale();

defineProps<DropdownMenuProps>();
</script>

<template>
  <VbenDropdownMenu :menus="menus" :modal="false">
    <button
      type="button"
      :aria-label="currentLocale === 'zh-CN' ? '标签页操作' : 'Tab actions'"
      class="flex-center h-full cursor-pointer border-l border-border px-2 text-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <LayoutGrid class="size-4" />
    </button>
  </VbenDropdownMenu>
</template>
