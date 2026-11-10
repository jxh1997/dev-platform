import {
  User,
  UserPermission,
  BootstrapState,
} from './entities/system/user.entity';
import { Session } from './entities/system/session.entity';
import { Audit, Idempotency } from './entities/system/audit.entity';
import { DemoRecord } from './entities/demo/record.entity';
export const entities = [
  User,
  UserPermission,
  BootstrapState,
  Session,
  Audit,
  Idempotency,
  DemoRecord,
];
