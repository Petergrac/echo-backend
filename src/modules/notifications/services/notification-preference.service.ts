import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationPreferences } from '../entities/notification-preferences.entity';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UpdatePreferencesDto } from '../dto/update-preference.dto';
import { plainToInstance } from 'class-transformer';
import { NotificationPreferencesResponseDto } from '../dto/response-preferences.dto';

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);
  constructor(
    @InjectRepository(NotificationPreferences)
    private readonly prefRepo: Repository<NotificationPreferences>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  //TODO -------------------- GET USER PREFERENCES =================
  async getUserPreferences(userId: string) {
    try {
      const preferences = await this.prefRepo.findOne({
        where: { userId },
        relations: ['user'],
      });
      if (!preferences) {
        //* 1.Create default preferences
        return this.createDefaultPreferences(userId);
      }
      return preferences;
    } catch (error) {
      this.logger.error(`Error getting user preferences: ${error.message}`);
      throw error;
    }
  }

  //TODO ================= UPDATE USER PREFERENCES ===========
  async updateUserPreferences(
    userId: string,
    updateDto: UpdatePreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    try {
      //* 1.Find existing preferences or create default
      let preferences = await this.prefRepo.findOne({
        where: { userId },
      });
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }
      //* 2.Update only provided fields
      const updatedFields = Object.keys(updateDto).filter(
        (key) => updateDto[key] !== undefined,
      );
      if (updatedFields.length === 0)
        return plainToInstance(
          NotificationPreferencesResponseDto,
          preferences,
          {
            excludeExtraneousValues: true,
          },
        ); //* No change
      //* 3.Apply updates
      if (updateDto.mutedUsers && updateDto.mutedUsers?.length > 0) {
        this.logger.debug(
          `Looking for users: ${JSON.stringify(updateDto.mutedUsers)}`,
        );
        const mutedUserIds = await this.userRepo
          .createQueryBuilder('user')
          .select('user.id')
          .where('LOWER(user.username) IN (:...usernames)', {
            usernames: updateDto.mutedUsers.map((u) => u.toLowerCase()),
          })
          .getMany();

        if (mutedUserIds.length === 0) {
          this.logger.warn(
            `No users found with usernames: ${updateDto.mutedUsers.join(', ')}`,
          );
        }
        updateDto.mutedUsers = mutedUserIds.map((u) => u.id);
      }
      Object.assign(preferences, updateDto);
      //* 4.Save updated preferences
      const savedPreferences = await this.prefRepo.save(preferences);
      return plainToInstance(
        NotificationPreferencesResponseDto,
        savedPreferences,
        {
          excludeExtraneousValues: true,
        },
      );
    } catch (error) {
      this.logger.error(`Error updating preferences: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== TOGGLE USER MUTE ====================
  async toggleUserMute(
    userId: string,
    targetUserId: string,
    mute: boolean,
  ): Promise<NotificationPreferencesResponseDto> {
    try {
      const preferences = await this.getUserPreferences(userId);

      if (mute) {
        //* 1.Add user to muted list if not already there
        if (!preferences.mutedUsers.includes(targetUserId)) {
          preferences.mutedUsers = [...preferences.mutedUsers, targetUserId];
        }
      } else {
        //* 2.Remove user from muted list
        preferences.mutedUsers = preferences.mutedUsers.filter(
          (id) => id !== targetUserId,
        );
      }

      const savedPreferences = await this.prefRepo.save(preferences);

      this.logger.log(
        `${mute ? 'Muted' : 'Unmuted'} user ${targetUserId} for user: ${userId}`,
      );

      return plainToInstance(
        NotificationPreferencesResponseDto,
        savedPreferences,
        {
          excludeExtraneousValues: true,
        },
      );
    } catch (error) {
      this.logger.error(`Error toggling user mute: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== TOGGLE KEYWORD MUTE ====================
  async toggleKeywordMute(
    userId: string,
    keyword: string,
    mute: boolean,
  ): Promise<NotificationPreferencesResponseDto> {
    try {
      const normalizedKeyword = keyword.toLowerCase().trim();
      const preferences = await this.getUserPreferences(userId);

      if (mute) {
        //* 1.Add keyword to muted list if not already there
        if (!preferences.mutedKeywords.includes(normalizedKeyword)) {
          preferences.mutedKeywords = [
            ...preferences.mutedKeywords,
            normalizedKeyword,
          ];
        }
      } else {
        //* 2.Remove keyword from muted list
        preferences.mutedKeywords = preferences.mutedKeywords.filter(
          (k) => k !== normalizedKeyword,
        );
      }

      const savedPreferences = await this.prefRepo.save(preferences);

      this.logger.log(
        `${mute ? 'Muted' : 'Unmuted'} keyword "${keyword}" for user: ${userId}`,
      );

      return plainToInstance(
        NotificationPreferencesResponseDto,
        savedPreferences,
        {
          excludeExtraneousValues: true,
        },
      );
    } catch (error) {
      this.logger.error(`Error toggling keyword mute: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== RESET TO DEFAULTS ====================
  async resetToDefaults(
    userId: string,
  ): Promise<NotificationPreferencesResponseDto> {
    try {
      //* Delete existing preferences and create new default ones
      await this.prefRepo.delete({ userId });

      const defaultPreferences = await this.createDefaultPreferences(userId);

      this.logger.log(
        `Reset notification preferences to defaults for user: ${userId}`,
      );

      return plainToInstance(
        NotificationPreferencesResponseDto,
        defaultPreferences,
        {
          excludeExtraneousValues: true,
        },
      );
    } catch (error) {
      this.logger.error(`Error resetting preferences: ${error.message}`);
      throw error;
    }
  }
  //TODO ==================== CHECK NOTIFICATION ALLOWED ====================
  async isNotificationAllowed(
    userId: string,
    type: string,
    actorId?: string,
    content?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const preferences = await this.getUserPreferences(userId);

      //* 1. Check if user is muted
      if (actorId && preferences.mutedUsers.includes(actorId)) {
        return { allowed: false, reason: 'User is muted' };
      }

      //* 2. Check if content contains muted keywords
      if (content && preferences.mutedKeywords.length > 0) {
        const lowerContent = content.toLowerCase();
        const hasMutedKeyword = preferences.mutedKeywords.some((keyword) =>
          lowerContent.includes(keyword.toLowerCase()),
        );
        if (hasMutedKeyword) {
          return { allowed: false, reason: 'Content contains muted keyword' };
        }
      }

      //* 3. Check type-specific preferences
      const typeAllowed = this.checkTypePreference(preferences, type);
      if (!typeAllowed) {
        return { allowed: false, reason: 'Notification type disabled' };
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error(
        `Error checking notification permission: ${error.message}`,
      );
      //* Default to allowing notifications if there's an error
      return { allowed: true };
    }
  }

  //TODO ==================== GET PREFERENCES FOR MULTIPLE USERS ====================
  async getBulkPreferences(
    userIds: string[],
  ): Promise<Map<string, NotificationPreferences>> {
    try {
      const preferences = await this.prefRepo.find({
        where: userIds.map((userId) => ({ userId })),
      });

      const preferencesMap = new Map<string, NotificationPreferences>();

      //* 1.Create default preferences for users who don't have them
      for (const userId of userIds) {
        const userPreferences = preferences.find((p) => p.userId === userId);
        if (userPreferences) {
          preferencesMap.set(userId, userPreferences);
        } else {
          //* 2.Create and store default preferences
          const defaultPreferences =
            await this.createDefaultPreferences(userId);
          preferencesMap.set(userId, defaultPreferences);
        }
      }

      return preferencesMap;
    } catch (error) {
      this.logger.error(`Error getting bulk preferences: ${error.message}`);
      throw error;
    }
  }
  //? ==================== PRIVATE METHODS ====================

  //* Create default notification preferences for a user
  private async createDefaultPreferences(
    userId: string,
  ): Promise<NotificationPreferences> {
    try {
      //* Verify user exists
      const user = await this.userRepo.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const defaultPreferences = this.prefRepo.create({
        userId,
        user,
        //* 1.All in-app notifications enabled by default
        likes: true,
        replies: true,
        reposts: true,
        follows: true,
        mentions: true,
        system: true,
        //* 2.Email notifications disabled by default (except system and digest)
        emailLikes: false,
        emailReplies: false,
        emailReposts: false,
        emailFollows: false,
        emailMentions: false,
        emailSystem: true,
        emailDigest: true,
        //* 3.Push notifications enabled by default
        pushLikes: true,
        pushReplies: true,
        pushReposts: true,
        pushFollows: true,
        pushMentions: true,
        pushSystem: true,
        //* 4.Additional preferences
        soundEnabled: true,
        vibrationEnabled: true,
        deliveryTiming: 'immediate',
        mutedUsers: [],
        mutedKeywords: [],
      });

      const savedPreferences = await this.prefRepo.save(defaultPreferences);

      this.logger.log(
        `Created default notification preferences for user: ${userId}`,
      );

      return savedPreferences;
    } catch (error) {
      this.logger.error(`Error creating default preferences: ${error.message}`);
      throw error;
    }
  }

  //* Check if a specific notification type is allowed
  private checkTypePreference(
    preferences: NotificationPreferences,
    type: string,
  ): boolean {
    switch (type) {
      case 'LIKE':
        return preferences.likes;
      case 'REPLY':
        return preferences.replies;
      case 'REPOST':
        return preferences.reposts;
      case 'FOLLOW':
        return preferences.follows;
      case 'MENTION':
        return preferences.mentions;
      case 'SYSTEM':
        return preferences.system;
      default:
        return true; //* Allow unknown types by default
    }
  }
}
