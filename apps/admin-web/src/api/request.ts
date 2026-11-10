import { useAppConfig } from '@vben/hooks';
import { defaultResponseInterceptor, RequestClient } from '@vben/request';
import { useAccessStore } from '@vben/stores';
import { ElMessage } from 'element-plus';
import { refreshTokenApi } from './core/auth';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
export const baseRequestClient = new RequestClient({
  baseURL: apiURL,
  withCredentials: true,
  responseReturn: 'data',
});
export const requestClient = new RequestClient({
  baseURL: apiURL,
  withCredentials: true,
  responseReturn: 'data',
});
for (const client of [requestClient, baseRequestClient]) {
  client.addRequestInterceptor({
    fulfilled(config) {
      const method = config.method?.toUpperCase() ?? 'GET';
      if (!['GET', 'POST'].includes(method))
        throw new Error('业务请求只允许 GET / POST');
      const token = useAccessStore().accessToken;
      config.headers.Authorization = token ? `Bearer ${token}` : undefined;
      return config;
    },
  });
}
for (const client of [requestClient, baseRequestClient])
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );
requestClient.addResponseInterceptor({
  rejected: async (error) => {
    const code = error.response?.data?.businessCode;
    const config = error.config;
    if (
      code === 'AUTH_ACCESS_EXPIRED' &&
      !config?.headers?.['X-DevPlatform-Retried']
    ) {
      try {
        await refreshTokenApi();
        // 只自动重放只读请求，写请求由页面沿用原幂等键人工重试。
        if (config?.method?.toUpperCase() === 'GET')
          return requestClient.request(config.url, {
            ...config,
            headers: { ...config.headers, 'X-DevPlatform-Retried': '1' },
          });
        ElMessage.warning('登录凭证已续期，请重试原操作');
      } catch {
        useAccessStore().setAccessToken(null);
      }
    } else if (
      ['AUTH_SESSION_REVOKED', 'AUTH_INVALID_TOKEN', 'AUTH_REQUIRED'].includes(
        code,
      )
    ) {
      useAccessStore().setAccessToken(null);
      window.location.hash = '#/auth/login';
    }
    ElMessage.error(
      error.response?.data?.message || '请求失败，请检查连接后重试',
    );
    throw error;
  },
});
