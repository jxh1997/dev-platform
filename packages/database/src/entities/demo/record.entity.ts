import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('demo_record')
export class DemoRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id!: string;
  @Column({ type: 'varchar', length: 64, unique: true }) code!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'varchar', length: 16 }) status!: 'enabled' | 'disabled';
  @Column({ type: 'varchar', length: 500, nullable: true }) remark!:
    | string
    | null;
  @Column({ name: 'created_by', type: 'bigint', unsigned: true })
  createdBy!: string;
  @Column({ name: 'updated_by', type: 'bigint', unsigned: true })
  updatedBy!: string;
  @Column({ type: 'int', default: 1 }) version!: number;
  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @Column({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt!: Date;
  @Column({
    name: 'deleted_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  deletedAt!: Date | null;
}
