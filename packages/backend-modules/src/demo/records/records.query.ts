import type { EntityManager } from 'typeorm';
import { DemoRecord } from '../../../../database/src';
import { fail, type Principal } from '../../common/http';

export function operationScope(p: Principal, action: string): 'ALL' | 'SELF' {
  const scope = p.permissions[`demo:record:${action}`];
  if (scope !== 'ALL' && scope !== 'SELF')
    fail(403, 'AUTHZ_DENIED', '没有此操作权限');
  return scope;
}
export function visibleRecords(
  em: EntityManager,
  p: Principal,
  action: string,
) {
  const qb = em
    .getRepository(DemoRecord)
    .createQueryBuilder('r')
    .where('r.deletedAt IS NULL');
  if (operationScope(p, action) === 'SELF')
    qb.andWhere('r.createdBy = :userId', { userId: p.userId });
  return qb;
}
