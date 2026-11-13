import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      build: { license: { fileName: 'third-party/bundled-licenses.json' } },
      optimizeDeps: {
        // Element Plus 的按需样式在懒加载页面转换后才出现，预先登记避免首次导航触发 504 重优化。
        include: ['element-plus', ...['alert', 'button', 'dialog', 'empty', 'form', 'form-item', 'input', 'message', 'message-box', 'option', 'pagination', 'select', 'table', 'table-column', 'tag'].map(name => `element-plus/es/components/${name}/style/css`)],
      },
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
      ],
      server: {
        host: '127.0.0.1',
        proxy: {
          '/api': {
            changeOrigin: true,
            
            // 本地真实 API；保留 /api/v1 路径
            target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:4310',
            ws: false,
          },
        },
      },
    },
  };
});
