import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
  User,
} from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(data: { email: string; password: string; name: string }): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = this.usersRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
    });

    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateProfile(
    userId: string,
    dto: { name?: string; email?: string },
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email !== undefined && dto.email !== user.email) {
      const existing = await this.usersRepository.findOne({
        where: { email: dto.email },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email;
    }

    if (dto.name !== undefined) user.name = dto.name;
    return this.usersRepository.save(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Текущий пароль введён неверно');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
  }

  async updateNotificationPreferences(
    userId: string,
    patch: Partial<NotificationPreferences>,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const fromDbRaw = user.notificationPreferences;
    const current = fromDbRaw
      ? JSON.parse(JSON.stringify(fromDbRaw)) as NotificationPreferences
      : DEFAULT_NOTIFICATION_PREFERENCES;

    // Строим новый объект явно по каждому полю
    const next: NotificationPreferences = {
      statusChanges:
        patch.statusChanges !== undefined
          ? patch.statusChanges
          : current.statusChanges ?? DEFAULT_NOTIFICATION_PREFERENCES.statusChanges,
      newItems:
        patch.newItems !== undefined
          ? patch.newItems
          : current.newItems ?? DEFAULT_NOTIFICATION_PREFERENCES.newItems,
      payments:
        patch.payments !== undefined
          ? patch.payments
          : current.payments ?? DEFAULT_NOTIFICATION_PREFERENCES.payments,
      deadline:
        patch.deadline !== undefined
          ? patch.deadline
          : current.deadline ?? DEFAULT_NOTIFICATION_PREFERENCES.deadline,
    };

    user.notificationPreferences = next;
    return this.usersRepository.save(user);
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.usersRepository.findBy({ id: In(ids) });
  }
}