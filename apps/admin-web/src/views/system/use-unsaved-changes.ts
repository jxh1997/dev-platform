import { onMounted, onUnmounted } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ElMessageBox } from 'element-plus';
/** 编辑弹窗在路由切换／关闭浏览器时保护草稿；不持久化密码或业务输入。 */
export function useUnsavedChanges(dirty: () => boolean, saving: () => boolean) {
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (dirty() || saving()) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  onMounted(() => window.addEventListener('beforeunload', beforeUnload));
  onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload));
  onBeforeRouteLeave(async () => {
    if (saving()) return false;
    if (!dirty()) return true;
    try {
      await ElMessageBox.confirm('离开后将丢失未保存的修改。', '放弃修改？', {
        confirmButtonText: '放弃修改',
        cancelButtonText: '继续编辑',
      });
      return true;
    } catch {
      return false;
    }
  });
}
