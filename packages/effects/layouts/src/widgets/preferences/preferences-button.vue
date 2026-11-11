<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import { $t } from '@vben/locales';
import { Settings } from '@vben/icons';

import { VbenIconButton } from '@vben-core/shadcn-ui';

import Preferences from './preferences.vue';

const preference =
  useTemplateRef<InstanceType<typeof Preferences>>('preference');
const emit = defineEmits<{ clearPreferencesAndLogout: [] }>();

function clearPreferencesAndLogout() {
  emit('clearPreferencesAndLogout');
}
</script>
<template>
  <Preferences
    ref="preference"
    @clear-preferences-and-logout="clearPreferencesAndLogout"
  >
    <VbenIconButton
      :aria-label="$t('preferences.title')"
      :tooltip="$t('preferences.title')"
      @click="preference?.open()"
      class="hover:animate-[shrink_0.3s_ease-in-out]"
    >
      <Settings class="size-4 text-foreground" />
    </VbenIconButton>
  </Preferences>
</template>
