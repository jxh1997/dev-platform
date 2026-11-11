import type { QueryRunner, TableColumn } from 'typeorm';

export class MigrationRecoveryError extends Error {
  constructor(readonly object: string) {
    super(
      `授权迁移恢复已停止：${object} 与迁移基线不一致；未覆盖现有结构或授权，请核对后新增兼容修复。`,
    );
    this.name = 'MigrationRecoveryError';
  }
}
type Column = {
  type: string;
  length?: string;
  nullable?: boolean;
  unsigned?: boolean;
  primary?: boolean;
  generated?: boolean;
  default?: string;
  collation?: string;
};
type Schema = {
  columns: Record<string, Column>;
  unique?: string[][];
  foreign?: [string, string, string][];
};
const id: Column = {
  type: 'bigint',
  unsigned: true,
  primary: true,
  generated: true,
};
const ref: Column = { type: 'bigint', unsigned: true };
const integer = (value?: string): Column => ({
  type: 'int',
  ...(value === undefined ? {} : { default: value }),
});
const text = (length: string, collation?: string): Column => ({
  type: 'varchar',
  length,
  ...(collation ? { collation } : {}),
});
const code = (length: string) => text(length, 'utf8mb4_0900_as_cs');
const flag = (value: string): Column => ({ type: 'tinyint', default: value });
export const authorizationSchema: Record<string, Schema> = {
  sys_security_state: {
    columns: {
      id: { type: 'int', primary: true },
      authz_epoch: { type: 'bigint', unsigned: true, default: '1' },
    },
  },
  sys_role: {
    columns: {
      id,
      code: code('64'),
      name: text('100'),
      enabled: flag('1'),
      is_super_admin: flag('0'),
      version: integer('1'),
    },
    unique: [['code']],
  },
  sys_permission: {
    columns: {
      code: { ...code('100'), primary: true },
      title: text('100'),
      enabled: flag('1'),
    },
  },
  sys_user_role: {
    columns: {
      user_id: { ...ref, primary: true },
      role_id: { ...ref, primary: true },
    },
    foreign: [
      ['user_id', 'sys_user', 'id'],
      ['role_id', 'sys_role', 'id'],
    ],
  },
  sys_role_permission: {
    columns: {
      role_id: { ...ref, primary: true },
      code: { ...code('100'), primary: true },
      scope: text('8'),
    },
    foreign: [
      ['role_id', 'sys_role', 'id'],
      ['code', 'sys_permission', 'code'],
    ],
  },
  sys_menu: {
    columns: {
      id,
      code: code('64'),
      parent_id: { ...ref, nullable: true },
      name: code('100'),
      path: code('250'),
      title: text('100'),
      component: text('100'),
      permission: text('100'),
      type: text('16'),
      sort: integer('0'),
      visible: flag('1'),
      enabled: flag('1'),
      version: integer('1'),
    },
    unique: [['code'], ['name'], ['path']],
    foreign: [['parent_id', 'sys_menu', 'id']],
  },
  sys_role_menu: {
    columns: {
      role_id: { ...ref, primary: true },
      menu_id: { ...ref, primary: true },
    },
    foreign: [
      ['role_id', 'sys_role', 'id'],
      ['menu_id', 'sys_menu', 'id'],
    ],
  },
};
const defaultValue = (value: unknown) =>
  value === undefined || value === null
    ? undefined
    : String(value).replace(/^'(.*)'$/, '$1');
function compatible(column: TableColumn, expected: Column) {
  return (
    column.type === expected.type &&
    (column.length || '') === (expected.length ?? '') &&
    column.isNullable === Boolean(expected.nullable) &&
    column.unsigned === Boolean(expected.unsigned) &&
    column.isPrimary === Boolean(expected.primary) &&
    column.isGenerated === Boolean(expected.generated) &&
    defaultValue(column.default) === expected.default &&
    !column.asExpression
  );
}
/** 只认可已存在且结构完全匹配的步骤；不以 hasColumn／IF NOT EXISTS 代替结构校验。 */
export async function validateAuthorizationSchema(q: QueryRunner) {
  for (const [table, column, expected] of [
    ['sys_user', 'version', integer('1')],
    ['sys_session', 'revoked_reason', { ...text('64'), nullable: true }],
  ] as const) {
    const existing = await q.getTable(table);
    const field = existing?.findColumnByName(column);
    if (field && !compatible(field, expected))
      throw new MigrationRecoveryError(`${table}.${column}`);
  }
  for (const [name, expected] of Object.entries(authorizationSchema)) {
    const actual = await q.getTable(name);
    if (!actual) continue;
    if (actual.columns.length !== Object.keys(expected.columns).length)
      throw new MigrationRecoveryError(`${name} 字段清单`);
    for (const [key, spec] of Object.entries(expected.columns)) {
      const field = actual.findColumnByName(key);
      if (!field || !compatible(field, spec))
        throw new MigrationRecoveryError(`${name}.${key}`);
    }
    // TypeORM 省略等于默认值的列排序规则，因此从 information_schema 核对显式的编码规则。
    const collations: { COLUMN_NAME: string; COLLATION_NAME: string | null }[] =
      await q.query(
        'SELECT COLUMN_NAME,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',
        [name],
      );
    for (const [key, spec] of Object.entries(expected.columns))
      if (
        spec.collation &&
        collations.find((c) => c.COLUMN_NAME === key)?.COLLATION_NAME !==
          spec.collation
      )
        throw new MigrationRecoveryError(`${name}.${key} 排序规则`);
    const keys = new Set([
      ...actual.indices
        .filter((i) => i.isUnique)
        .map((i) => i.columnNames.join(',')),
      ...actual.uniques.map((i) => i.columnNames.join(',')),
      ...actual.columns
        .filter((c) => c.isUnique && !c.isPrimary)
        .map((c) => c.name),
    ]);
    const expectedKeys = new Set(
      (expected.unique ?? []).map((k) => k.join(',')),
    );
    if (
      keys.size !== expectedKeys.size ||
      [...keys].some((k) => !expectedKeys.has(k))
    )
      throw new MigrationRecoveryError(`${name} 唯一约束`);
    const foreign = actual.foreignKeys.map(
      (f) =>
        `${f.columnNames.join(',')}:${f.referencedTableName.split('.').at(-1)}:${f.referencedColumnNames.join(',')}`,
    );
    const expectedForeign = (expected.foreign ?? []).map((f) => f.join(':'));
    if (
      foreign.length !== expectedForeign.length ||
      foreign.some((f) => !expectedForeign.includes(f)) ||
      actual.foreignKeys.some(
        (f) =>
          ![undefined, 'NO ACTION', 'RESTRICT'].includes(f.onDelete) ||
          ![undefined, 'NO ACTION', 'RESTRICT'].includes(f.onUpdate),
      )
    )
      throw new MigrationRecoveryError(`${name} 外键`);
    const engine: { ENGINE: string }[] = await q.query(
      'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',
      [name],
    );
    if (engine[0]?.ENGINE !== 'InnoDB')
      throw new MigrationRecoveryError(`${name} 存储引擎`);
  }
}
