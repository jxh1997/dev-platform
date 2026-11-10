import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_user')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id!: string;
  @Column({ type: 'varchar', length: 64, unique: true }) username!: string;
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash!: string;
  @Column({ name: 'real_name', type: 'varchar', length: 100 })
  realName!: string;
  @Column({ type: 'boolean', default: true }) enabled!: boolean;
  @Column({ name: 'must_change_password', type: 'boolean', default: true })
  mustChangePassword!: boolean;
  @Column({ name: 'security_version', type: 'int', default: 1 })
  securityVersion!: number;
}

@Entity('sys_user_permission')
export class UserPermission {
  @Column({ name: 'user_id', type: 'bigint', unsigned: true, primary: true })
  userId!: string;
  @Column({ type: 'varchar', length: 100, primary: true }) code!: string;
  @Column({ type: 'varchar', length: 8 }) scope!: 'ALL' | 'SELF';
}

@Entity('sys_bootstrap')
export class BootstrapState {
  @Column({ type: 'int', primary: true }) id!: number;
  @Column({ type: 'boolean', default: false }) completed!: boolean;
}
