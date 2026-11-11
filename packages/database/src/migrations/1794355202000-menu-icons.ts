import type { MigrationInterface, QueryRunner } from 'typeorm';
export class MenuIcons1794355202000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      "ALTER TABLE sys_menu ADD icon VARCHAR(100) NOT NULL DEFAULT 'lucide:folder'",
    );
    await q.query(
      "UPDATE sys_menu SET icon=CASE code WHEN 'records' THEN 'lucide:database' WHEN 'users' THEN 'lucide:users' WHEN 'roles' THEN 'lucide:shield' WHEN 'menus' THEN 'lucide:menu' ELSE icon END WHERE code IN ('records','users','roles','menus')",
    );
  }
  async down(): Promise<void> {
    throw new Error('菜单字段不自动删除；使用前滚迁移。');
  }
}
