import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 账号统一为小写；历史大小写冲突必须人工核对，不能静默合并身份。 */
export class NormalizeUsernames1794355201000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    const duplicates: unknown[] = await q.query(
      'SELECT 1 FROM sys_user GROUP BY LOWER(TRIM(username)) COLLATE utf8mb4_0900_as_cs HAVING COUNT(*) > 1 LIMIT 1',
    );
    if (duplicates.length)
      throw new Error(
        '历史账号存在标准化冲突，请人工核对后以新增修复迁移处理，不自动合并',
      );
    await q.query(
      'UPDATE sys_user SET username=LOWER(TRIM(username)) WHERE BINARY username<>BINARY LOWER(TRIM(username))',
    );
  }
  async down(): Promise<void> {
    throw new Error('账号规范化不自动还原；按备份与前滚方案处理。');
  }
}
