import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('sys_session')
export class Session {
  @PrimaryColumn({ type: 'char', length: 36 }) id!: string;
  @Column({ name: 'user_id', type: 'bigint', unsigned: true }) userId!: string;
  @Column({ name: 'refresh_hash', type: 'char', length: 64 })
  refreshHash!: string;
  @Column({ type: 'int', default: 1 }) generation!: number;
  @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
  expiresAt!: Date;
  @Column({
    name: 'revoked_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  revokedAt!: Date | null;
  @Column({
    name: 'revoked_reason',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  revokedReason!: string | null;
  @Column({ name: 'security_version', type: 'int' }) securityVersion!: number;
}
