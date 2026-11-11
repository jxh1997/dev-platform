import { onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue';
import type { Query } from '#/api/system';
export function useSystemList<T>(
  fetchPage: (query: Query) => Promise<{ list: T[]; total: number }>,
) {
  const items = shallowRef<T[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref('');
  const query = reactive({ page: 1, pageSize: 20, search: '' });
  let sequence = 0;
  async function load(reset = false) {
    if (reset) query.page = 1;
    const current = ++sequence;
    loading.value = true;
    error.value = '';
    try {
      const result = await fetchPage({
        ...query,
        search: query.search || undefined,
      });
      if (current === sequence) {
        items.value = result.list;
        total.value = result.total;
      }
    } catch {
      if (current === sequence)
        error.value = '加载失败，请检查权限与服务连接后重试。';
    } finally {
      if (current === sequence) loading.value = false;
    }
  }
  onMounted(() => load());
  onUnmounted(() => {
    sequence++;
  });
  return { items, total, loading, error, query, load };
}
