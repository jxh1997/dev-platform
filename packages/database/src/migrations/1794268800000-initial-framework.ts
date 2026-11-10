import type { MigrationInterface, QueryRunner } from 'typeorm';

/** M0 初始结构；DDL 在 MySQL 中不能依赖事务回滚，失败后检查已建表并前滚修复。 */
export class InitialFramework1794268800000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TABLE sys_bootstrap (id INT NOT NULL PRIMARY KEY, completed TINYINT NOT NULL DEFAULT 0) ENGINE=InnoDB`,
    );
    await q.query(`INSERT INTO sys_bootstrap (id, completed) VALUES (1, 0)`);
    await q.query(`CREATE TABLE sys_user (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) COLLATE utf8mb4_0900_as_cs NOT NULL,
      password_hash VARCHAR(255) NOT NULL, real_name VARCHAR(100) NOT NULL,
      enabled TINYINT NOT NULL DEFAULT 1, must_change_password TINYINT NOT NULL DEFAULT 1,
      security_version INT NOT NULL DEFAULT 1, UNIQUE KEY uq_user_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE sys_user_permission (
      user_id BIGINT UNSIGNED NOT NULL, code VARCHAR(100) NOT NULL, scope VARCHAR(8) NOT NULL,
      PRIMARY KEY (user_id, code), CONSTRAINT fk_permission_user FOREIGN KEY (user_id) REFERENCES sys_user(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE sys_session (
      id CHAR(36) NOT NULL PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, refresh_hash CHAR(64) NOT NULL,
      generation INT NOT NULL DEFAULT 1, expires_at DATETIME(3) NOT NULL, revoked_at DATETIME(3) NULL,
      security_version INT NOT NULL, KEY ix_session_user (user_id),
      CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES sys_user(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE sys_audit (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
      action VARCHAR(100) NOT NULL, resource_id VARCHAR(64) NOT NULL, request_id VARCHAR(36) NOT NULL,
      details JSON NOT NULL, created_at DATETIME(3) NOT NULL, KEY ix_audit_user_time (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE sys_idempotency (
      user_id BIGINT UNSIGNED NOT NULL, endpoint VARCHAR(100) NOT NULL,
      request_key VARCHAR(100) COLLATE utf8mb4_0900_as_cs NOT NULL, digest CHAR(64) NOT NULL,
      response JSON NOT NULL, created_at DATETIME(3) NOT NULL, PRIMARY KEY (user_id, endpoint, request_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE demo_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) COLLATE utf8mb4_0900_as_cs NOT NULL,
      name VARCHAR(100) NOT NULL, status VARCHAR(16) NOT NULL, remark VARCHAR(500) NULL,
      created_by BIGINT UNSIGNED NOT NULL, updated_by BIGINT UNSIGNED NOT NULL, version INT NOT NULL DEFAULT 1,
      created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL, deleted_at DATETIME(3) NULL,
      UNIQUE KEY uq_record_code (code), KEY ix_record_owner (created_by, deleted_at, created_at, id),
      KEY ix_record_time (deleted_at, created_at, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
  async down(): Promise<void> {
    throw new Error(
      '初始结构不提供自动删表回滚；使用已演练的备份恢复或前滚迁移。',
    );
  }
}
