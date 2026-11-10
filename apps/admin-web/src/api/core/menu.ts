import type { RouteRecordStringComponent } from '@vben/types';
import type { components } from '@dev-platform/contracts/openapi';
import { requestClient } from '#/api/request';
export async function getAllMenusApi(): Promise<RouteRecordStringComponent[]> {
  const result =
    await requestClient.get<components['schemas']['MenuResponse'][]>(
      '/auth/menus',
    );
  return result.map((item) => ({ ...item }));
}
