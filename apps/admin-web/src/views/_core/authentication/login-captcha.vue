<script setup lang="ts">
import {
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  useTemplateRef,
} from 'vue';
import { SliderCaptcha } from '@vben/common-ui';
import { ElButton } from 'element-plus';
import { createLoginCaptchaApi, verifyLoginCaptchaApi } from '#/api/core/auth';
const token = defineModel<string>({ default: '' });
const slider = useTemplateRef<InstanceType<typeof SliderCaptcha>>('slider');
const root = useTemplateRef<HTMLDivElement>('root');
const challengeId = ref('');
const loading = ref(true);
const verifying = ref(false);
const message = ref('正在加载验证…');
let generation = 0;
let disposed = false;
let active = false;
let expiry: ReturnType<typeof setTimeout> | undefined;

async function reset() {
  const current = ++generation;
  clearTimeout(expiry);
  token.value = '';
  challengeId.value = '';
  loading.value = true;
  verifying.value = false;
  message.value = '正在加载验证…';
  slider.value?.resume();
  try {
    const result = await createLoginCaptchaApi();
    if (disposed || current !== generation) return;
    challengeId.value = result.challengeId;
    message.value = '';
    expiry = setTimeout(
      () => {
        token.value = '';
        challengeId.value = '';
        slider.value?.resume();
        message.value = '验证已过期，请刷新验证后重试';
      },
      Math.max(0, Date.parse(result.expiresAt) - Date.now()),
    );
  } catch {
    if (!disposed && current === generation)
      message.value = '验证加载失败，请刷新验证';
  } finally {
    if (!disposed && current === generation) loading.value = false;
  }
}
async function verify() {
  if (!challengeId.value || verifying.value || disposed) return;
  const current = generation;
  verifying.value = true;
  message.value = '正在验证…';
  try {
    const result = await verifyLoginCaptchaApi({
      challengeId: challengeId.value,
      progress: 100,
    });
    if (disposed || current !== generation) return;
    token.value = result.captchaToken;
    challengeId.value = '';
    message.value = '验证通过';
    clearTimeout(expiry);
    expiry = setTimeout(
      () => {
        token.value = '';
        slider.value?.resume();
        message.value = '验证已过期，请刷新验证后重试';
      },
      Math.max(0, Date.parse(result.expiresAt) - Date.now()),
    );
  } catch {
    if (!disposed && current === generation) {
      slider.value?.resume();
      challengeId.value = '';
      message.value = '验证失败，请刷新验证后重试';
    }
  } finally {
    if (!disposed && current === generation) verifying.value = false;
  }
}
function requireVerification() {
  message.value = '请先完成滑块验证';
  nextTick(() =>
    root.value?.querySelector<HTMLElement>('[role="slider"]')?.focus(),
  );
}
function activate() {
  if (active || disposed) return;
  active = true;
  void reset();
}
// AuthPageLayout 会缓存 Login；离开后不能保留已被登录接口消费的一次性凭证。
onMounted(activate);
onActivated(activate);
onDeactivated(() => {
  active = false;
  generation++;
  clearTimeout(expiry);
  token.value = '';
  challengeId.value = '';
  verifying.value = false;
});
onBeforeUnmount(() => {
  disposed = true;
  generation++;
  clearTimeout(expiry);
});
defineExpose({ reset, requireVerification });
</script>
<template>
  <div ref="root" class="login-captcha" :aria-busy="loading || verifying">
    <div class="captcha-label">
      <span>安全验证</span
      ><ElButton
        text
        size="small"
        :disabled="loading || verifying"
        @click="reset"
        >刷新验证</ElButton
      >
    </div>
    <div v-if="loading" class="captcha-loading">正在加载验证…</div>
    <SliderCaptcha
      v-else-if="challengeId || token || verifying"
      ref="slider"
      text="请按住滑块拖动到最右侧"
      success-text="滑块已完成"
      @success="verify"
    />
    <p class="captcha-feedback" role="status" aria-live="polite">
      {{ message || '也可聚焦滑块后，按向右方向键完成验证。' }}
    </p>
  </div>
</template>
<style scoped>
.login-captcha {
  margin: 4px 0 12px;
}
.captcha-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}
.captcha-feedback {
  min-height: 20px;
  margin-top: 6px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  line-height: 1.6;
}
.captcha-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}
:deep([role='slider']:focus-visible) {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 3px;
}
</style>
