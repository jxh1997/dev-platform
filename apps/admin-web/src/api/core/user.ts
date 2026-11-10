import type { UserInfo } from '@vben/types';
import type { components } from '@dev-platform/contracts/openapi';
import { requestClient } from '#/api/request';
export async function getUserInfoApi(): Promise<
  UserInfo & components['schemas']['UserResponse']
> {
  const result =
    await requestClient.get<components['schemas']['UserResponse']>('/auth/me');
  return { ...result, avatar: '/avatar.svg', desc: '', token: '' };
}
