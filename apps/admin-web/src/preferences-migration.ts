import { StorageManager } from '@vben/utils';
/** 首次恢复 M0 被强制关闭的两个界面入口，不清空用户的其他偏好。 */
export async function migrateShellPreferences(namespace: string) {
  const cache = new StorageManager({ prefix: namespace });
  if (await cache.getItem<boolean>('shell-capabilities-v1')) return;
  const saved = await cache.getItem<Record<string, unknown>>('preferences');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    const widget =
      saved.widget &&
      typeof saved.widget === 'object' &&
      !Array.isArray(saved.widget)
        ? saved.widget
        : {};
    await cache.setItem('preferences', {
      ...saved,
      widget: { ...widget, notification: true, lockScreen: true },
    });
  }
  await cache.setItem('shell-capabilities-v1', true);
}
