import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from './order.entity';

@Entity('order_participants')
@Unique(['orderId', 'userId']) // один user — одна запись в заказе
export class OrderParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: false })
  hasPaid: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  paymentConfirmedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt: Date;
}