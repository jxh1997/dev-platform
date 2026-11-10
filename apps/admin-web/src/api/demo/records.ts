import type { components } from '@dev-platform/contracts/openapi';
import { requestClient } from '#/api/request';
export type RecordItem = components['schemas']['RecordResponse'];
export type CreateRecord = components['schemas']['CreateRecordDto'];
export type UpdateRecord = components['schemas']['UpdateRecordDto'];
export const recordsApi = {
  list: (params: { page: number; pageSize: number; name?: string }) => requestClient.get<components['schemas']['RecordsPageResponse']>('/demo/records', { params }),
  read: (id: string) => requestClient.get<RecordItem>(`/demo/records/${id}`),
  create: (data: CreateRecord, key: string) => requestClient.post<RecordItem>('/demo/records', data, { headers: { 'Idempotency-Key': key } }),
  update: (id: string, data: UpdateRecord) => requestClient.post<RecordItem>(`/demo/records/${id}/update`, data),
  remove: (id: string, version: number) => requestClient.post(`/demo/records/${id}/delete`, { version }),
};
