import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: any) {
    const full = await this.usersService.findById(user.id);
    if (!full) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...publicUser } = full;
    return publicUser;
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...publicUser } = updated;
    return publicUser;
  }

  @Patch('me/password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true };
  }

  @Patch('me/notification-preferences')
  async updateNotificationPrefs(
    @CurrentUser() user: any,
    @Body() dto: UpdateNotificationPrefsDto,
  ) {
    const updated = await this.usersService.updateNotificationPreferences(
      user.id,
      dto,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...publicUser } = updated;
    return publicUser;
  }
}