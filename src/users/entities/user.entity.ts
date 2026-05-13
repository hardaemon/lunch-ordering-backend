import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type NotificationPreferences = {
  statusChanges: boolean;
  newItems: boolean;
  payments: boolean;
  deadline: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  statusChanges: true,
  newItems: true,
  payments: true,
  deadline: true,
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({
    type: 'jsonb',
    default: () => `'${JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES)}'::jsonb`,
  })
  notificationPreferences: NotificationPreferences;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}