import type { components } from '@dev-platform/contracts/openapi';
import { useAccessStore } from '@vben/stores';
import { baseRequestClient, requestClient } from '#/api/request';
export namespace AuthApi {
  export type LoginParams = components['schemas']['LoginDto'];
  export type LoginResult = components['schemas']['TokenResponse'];
}
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', {
    username: data.username,
    password: data.password,
  });
}
let refreshing: Promise<string> | undefined;
export function refreshTokenApi(): Promise<string> {
  if (refreshing) return refreshing;
  const refresh = async () => {
    const response = await baseRequestClient.post<AuthApi.LoginResult>(
      '/auth/refresh',
      {},
    );
    const token = response.accessToken;
    useAccessStore().setAccessToken(token);
    return token;
  };
  refreshing = (
    navigator.locks
      ? navigator.locks.request('dev-platform-refresh', refresh)
      : refresh()
  ).finally(() => {
    refreshing = undefined;
  });
  return refreshing;
}
export function logoutApi() {
  return requestClient.post('/auth/logout', {});
}
export function getAccessCodesApi() {
  return requestClient.get<string[]>('/auth/permissions');
}
export function changePasswordApi(
  data: components['schemas']['ChangePasswordDto'],
) {
  return requestClient.post('/auth/password', data);
}
