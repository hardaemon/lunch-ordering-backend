import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderParticipant } from './order-participant.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  restaurantName: string;

  @Column({ type: 'text', nullable: true })
  restaurantUrl: string | null;

  @Column()
  deliveryAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryCost: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  freeDeliveryThreshold: string | null;

  @Column({ type: 'timestamptz' })
  deadlineAt: Date;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.COLLECTING,
  })
  status: OrderStatus;

  @Column({ type: 'timestamptz', nullable: true })
  deadlineReminderSentAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deadlineExpiredHandledAt: Date | null;

  @OneToMany(() => OrderParticipant, (p) => p.order, { cascade: true })
  participants: OrderParticipant[];

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}