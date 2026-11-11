export { createDataSource, databaseConfig } from './data-source';
export {
  User,
  UserPermission,
  BootstrapState,
} from './entities/system/user.entity';
export { Session } from './entities/system/session.entity';
export { Audit, Idempotency } from './entities/system/audit.entity';
export { DemoRecord } from './entities/demo/record.entity';

export {
  Role,
  RegisteredPermission,
  UserRole,
  RolePermission,
  Menu,
  RoleMenu,
  SecurityState,
} from './entities/system/authorization.entity';
export { permissionRegistry, pageRegistry } from './authorization-registry';

export { runDatabaseMigrations } from './migration-recovery/run-migrations';
