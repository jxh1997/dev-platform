import { operationScope, visibleRecords } from './records.query';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { createHash } from 'node:crypto';
import { Audit, DemoRecord, Idempotency, User } from '../../../../database/src';
import { fail, type AppRequest, type Principal } from '../../common/http';
import {
  CreateRecordDto,
  QueryRecordsDto,
  RecordResponse,
  UpdateRecordDto,
} from './records.dto';

function response(row: DemoRecord): RecordResponse {
  return {
    id: String(row.id),
    code: row.code,
    name: row.name,
    status: row.status,
    remark: row.remark,
    createdBy: String(row.createdBy),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
@Injectable()
export class RecordsService {
  constructor(private readonly db: DataSource) {}
  async list(p: Principal, dto: QueryRecordsDto) {
    const qb = visibleRecords(this.db.manager, p, 'list');
    if (dto.name) qb.andWhere('LOCATE(:name, r.name) > 0', { name: dto.name });
    if (dto.status) qb.andWhere('r.status = :status', { status: dto.status });
    const [rows, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('r.id', 'DESC')
      .skip((dto.page - 1) * dto.pageSize)
      .take(dto.pageSize)
      .getManyAndCount();
    return {
      list: rows.map(response),
      total,
      page: dto.page,
      pageSize: dto.pageSize,
    };
  }
  async read(p: Principal, id: string) {
    const row = await visibleRecords(this.db.manager, p, 'read')
      .andWhere('r.id = :id', { id })
      .getOne();
    if (!row) fail(404, 'RESOURCE_NOT_FOUND', '记录不存在或不可访问');
    return response(row);
  }
  async create(req: AppRequest, dto: CreateRecordDto, key: string | undefined) {
    const p = req.principal;
    operationScope(p, 'create');
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key))
      fail(400, 'VALIDATION_FAILED', '新增操作需要有效的 Idempotency-Key');
    const input = {
      code: dto.code,
      name: dto.name,
      status: dto.status ?? 'enabled',
      remark: dto.remark?.trim() || null,
    };
    const digest = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    try {
      return await this.db.transaction(async (em) => {
        // 按用户串行认领，避免同键并发创建与幂等结果写入之间出现窗口。
        await em.findOneOrFail(User, {
          where: { id: p.userId },
          lock: { mode: 'pessimistic_write' },
        });
        const previous = await em.findOneBy(Idempotency, {
          userId: p.userId,
          endpoint: 'demo.records.create',
          requestKey: key,
        });
        if (previous) {
          if (previous.digest !== digest)
            fail(409, 'IDEMPOTENCY_CONFLICT', '此幂等键已用于其他请求');
          return previous.response;
        }
        const now = new Date();
        await em.insert(DemoRecord, {
          ...input,
          createdBy: p.userId,
          updatedBy: p.userId,
          version: 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
        // 当前驱动对字符串 insertId 的生成映射存在兼容问题；同事务按唯一编码回读实际主键。
        const row = await em.findOneByOrFail(DemoRecord, { code: input.code });
        const result = response(row);
        await this.audit(em, req, 'create', row.id, { code: row.code });
        await em.save(
          Object.assign(new Idempotency(), {
            userId: p.userId,
            endpoint: 'demo.records.create',
            requestKey: key,
            digest,
            response: { ...result },
            createdAt: now,
          }),
        );
        return result;
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        'code' in error.driverError &&
        error.driverError.code === 'ER_DUP_ENTRY'
      )
        fail(409, 'RESOURCE_CONFLICT', '设备编码已存在，删除后仍不可复用');
      throw error;
    }
  }
  async update(req: AppRequest, id: string, dto: UpdateRecordDto) {
    const changes: {
      name?: string;
      status?: 'enabled' | 'disabled';
      remark?: string | null;
    } = {};
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.status !== undefined) changes.status = dto.status;
    if (dto.remark !== undefined) changes.remark = dto.remark?.trim() || null;
    if (!Object.keys(changes).length)
      fail(400, 'VALIDATION_FAILED', '至少修改一个业务字段');
    return this.mutate(req, id, dto.version, 'update', changes);
  }
  async remove(req: AppRequest, id: string, version: number) {
    await this.mutate(req, id, version, 'delete', {});
    return { id, version: version + 1, deleted: true };
  }
  private async mutate(
    req: AppRequest,
    id: string,
    version: number,
    action: 'update' | 'delete',
    changes: {
      name?: string;
      status?: 'enabled' | 'disabled';
      remark?: string | null;
    },
  ) {
    return this.db.transaction(async (em) => {
      const qb = em
        .createQueryBuilder()
        .update(DemoRecord)
        .set({
          ...changes,
          updatedBy: req.principal.userId,
          updatedAt: new Date(),
          version: () => 'version + 1',
          ...(action === 'delete' ? { deletedAt: new Date() } : {}),
        })
        .where('id = :id AND version = :version AND deleted_at IS NULL', {
          id,
          version,
        });
      if (operationScope(req.principal, action) === 'SELF')
        qb.andWhere('created_by = :userId', { userId: req.principal.userId });
      const result = await qb.execute();
      if (result.affected !== 1) {
        const visible = await visibleRecords(em, req.principal, action)
          .andWhere('r.id = :id', { id })
          .getOne();
        if (!visible) fail(404, 'RESOURCE_NOT_FOUND', '记录不存在或不可访问');
        fail(409, 'VERSION_CONFLICT', '记录已更新，请重新加载后比较');
      }
      await this.audit(em, req, action, id, {
        version: version + 1,
        fields: Object.keys(changes),
      });
      if (action === 'delete') return null;
      const updated = await em.findOneByOrFail(DemoRecord, { id });
      return response(updated);
    });
  }
  private audit(
    em: EntityManager,
    req: AppRequest,
    action: string,
    id: string,
    details: Record<string, unknown>,
  ) {
    return em.save(
      Object.assign(new Audit(), {
        userId: req.principal.userId,
        action: `demo:record:${action}`,
        resourceId: id,
        requestId: req.requestId,
        details,
        createdAt: new Date(),
      }),
    );
  }
}
