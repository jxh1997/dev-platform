import { Column, Entity, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity('sys_role')
export class Role {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id!: string;
  @Column({ type: 'varchar', length: 64, unique: true }) code!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'boolean', default: true }) enabled!: boolean;
  @Column({ name: 'is_super_admin', type: 'boolean', default: false })
  isSuperAdmin!: boolean;
  @Column({ type: 'int', default: 1 }) version!: number;
}
@Entity('sys_permission')
export class RegisteredPermission {
  @PrimaryColumn({ type: 'varchar', length: 100 }) code!: string;
  @Column({ type: 'varchar', length: 100 }) title!: string;
  @Column({ type: 'boolean', default: true }) enabled!: boolean;
}
@Entity('sys_user_role')
export class UserRole {
  @PrimaryColumn({ name: 'user_id', type: 'bigint', unsigned: true })
  userId!: string;
  @PrimaryColumn({ name: 'role_id', type: 'bigint', unsigned: true })
  roleId!: string;
}
@Entity('sys_role_permission')
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'bigint', unsigned: true })
  roleId!: string;
  @PrimaryColumn({ type: 'varchar', length: 100 }) code!: string;
  @Column({ type: 'varchar', length: 8 }) scope!: 'ALL' | 'SELF';
}
@Entity('sys_menu')
export class Menu {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id!: string;
  @Column({ type: 'varchar', length: 64, unique: true }) code!: string;
  @Column({ name: 'parent_id', type: 'bigint', unsigned: true, nullable: true })
  parentId!: string | null;
  @Column({ type: 'varchar', length: 100, unique: true }) name!: string;
  @Column({ type: 'varchar', length: 250, unique: true }) path!: string;
  @Column({ type: 'varchar', length: 100 }) title!: string;
  @Column({ type: 'varchar', length: 100, default: 'lucide:folder' })
  icon!: string;
  @Column({ type: 'varchar', length: 100 }) component!: string;
  @Column({ type: 'varchar', length: 100 }) permission!: string;
  @Column({ type: 'varchar', length: 16 }) type!:
    | 'directory'
    | 'page'
    | 'button'
    | 'link';
  @Column({ type: 'int', default: 0 }) sort!: number;
  @Column({ type: 'boolean', default: true }) visible!: boolean;
  @Column({ type: 'boolean', default: true }) enabled!: boolean;
  @Column({ type: 'int', default: 1 }) version!: number;
}
@Entity('sys_role_menu')
export class RoleMenu {
  @PrimaryColumn({ name: 'role_id', type: 'bigint', unsigned: true })
  roleId!: string;
  @PrimaryColumn({ name: 'menu_id', type: 'bigint', unsigned: true })
  menuId!: string;
}
@Entity('sys_security_state')
export class SecurityState {
  @PrimaryColumn({ type: 'int' }) id!: number;
  @Column({ name: 'authz_epoch', type: 'bigint', unsigned: true })
  authzEpoch!: string;
}
