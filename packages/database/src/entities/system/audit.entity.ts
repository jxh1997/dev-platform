import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_audit')
export class Audit {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id!: string;
  @Column({ name: 'user_id', type: 'bigint', unsigned: true }) userId!: string;
  @Column({ type: 'varchar', length: 100 }) action!: string;
  @Column({ name: 'resource_id', type: 'varchar', length: 64 })
  resourceId!: string;
  @Column({ name: 'request_id', type: 'varchar', length: 36 })
  requestId!: string;
  @Column({ type: 'json' }) details!: Record<string, unknown>;
  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
}

@Entity('sys_idempotency')
export class Idempotency {
  @Column({ name: 'user_id', type: 'bigint', unsigned: true, primary: true })
  userId!: string;
  @Column({ type: 'varchar', length: 100, primary: true }) endpoint!: string;
  @Column({ name: 'request_key', type: 'varchar', length: 100, primary: true })
  requestKey!: string;
  @Column({ type: 'char', length: 64 }) digest!: string;
  @Column({ type: 'json' }) response!: Record<string, unknown>;
  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
}
