import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { AuditLogService } from '../../../common/services/audit.service';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service';
import { Bookmark } from '../entities/bookmark.entity';
import { Reply } from '../entities/reply.entity';
import { Repost } from '../entities/repost.entity';
import { Post } from '../entities/post.entity';
import { Media } from '../entities/media.entity';
import { CreateReplyDto, UpdateReplyDto } from '../dto/create-reply.dto';
import { CreateRepostDto } from '../dto/create-repost.dto';
import { Like } from '../entities/post-like.entity';
import { AuditAction, AuditResource } from '../../../common/enums/audit.enums';
import { plainToInstance } from 'class-transformer';
import { PostResponseDto } from '../dto/post-response.dto';
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { ReplyResponseDto } from '../dto/reply-response.dto';
import { MentionService } from './mention.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { HashtagService } from './hashtag.service';

@Injectable()
export class EngagementService {
  constructor(
    //* Repositories
    @InjectRepository(Like) private readonly likeRepo: Repository<Like>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepo: Repository<Bookmark>,
    @InjectRepository(Reply) private readonly replyRepo: Repository<Reply>,
    @InjectRepository(Repost) private readonly repostRepo: Repository<Repost>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,

    //* Services
    private readonly auditService: AuditLogService,
    private readonly cloudinary: CloudinaryService,
    private readonly dataSource: DataSource,
    private readonly mentionService: MentionService,
    private readonly notificationService: NotificationsService,
    private readonly hashTagService: HashtagService,
  ) {}

  //TODO ==================== TOGGLE LIKE ====================
  async toggleLike(
    postId: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Check if post exists
      const post = await this.postRepo.findOneBy({ id: postId });
      if (!post) throw new NotFoundException('Post not found');
      //* 2. Check for existing like
      const existingLike = await this.likeRepo.findOne({
        where: { post: { id: postId }, user: { id: userId } },
        withDeleted: true,
      });

      let action: 'LIKED' | 'UNLIKED';

      if (existingLike && !existingLike.deletedAt) {
        //* 3. Unlike - soft delete existing like
        await queryRunner.manager.softDelete(Like, existingLike.id);
        await queryRunner.manager.decrement(
          Post,
          { id: postId },
          'likeCount',
          1,
        );
        action = 'UNLIKED';
      } else if (existingLike && existingLike.deletedAt) {
        //* 4. Restore like
        await queryRunner.manager.restore(Like, existingLike.id);
        await queryRunner.manager.increment(
          Post,
          { id: postId },
          'likeCount',
          1,
        );
        action = 'LIKED';

        //* 4.1 Send notification
        await this.notificationService.createNotification({
          type: NotificationType.LIKE,
          recipientId: post.authorId,
          actorId: userId,
          postId: postId,
        });
      } else {
        //* 5. Create new like
        const newLike = this.likeRepo.create({
          post: { id: postId },
          user: { id: userId },
        });
        await queryRunner.manager.save(Like, newLike);
        await queryRunner.manager.increment(
          Post,
          { id: postId },
          'likeCount',
          1,
        );
        action = 'LIKED';
        //* 5.1 Send notification(NEW)
        await this.notificationService.createNotification({
          type: NotificationType.LIKE,
          recipientId: post.authorId,
          actorId: userId,
          postId: postId,
        });
      }

      await queryRunner.commitTransaction();

      //* 6. Audit log
      await this.auditService.createLog({
        action:
          action === 'LIKED'
            ? AuditAction.POST_LIKED
            : AuditAction.POST_UNLIKED,
        resource: AuditResource.POST,
        userId,
        ip,
        userAgent,
        metadata: { postId, action },
      });

      return { status: action, postId };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET POST LIKES ====================
  async getPostLikes(postId: string, page: number = 1, limit: number = 20) {
    //* 1. Check if post exists
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post not found');

    //* 2. Get paginated likes with user details
    const [likes, total] = await this.likeRepo.findAndCount({
      where: { post: { id: postId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      likes: plainToInstance(
        UserResponseDto,
        likes.map((like) => like.user),
        {
          excludeExtraneousValues: true,
          exposeUnsetFields: false,
        },
      ),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  //TODO ==================== GET USER LIKED POSTS ====================
  async getUserLikedPosts(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const [likes, total] = await this.likeRepo.findAndCount({
      where: { user: { id: userId } },
      relations: ['post', 'post.author', 'post.media'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const posts = likes.map((like) => ({
      ...plainToInstance(PostResponseDto, like.post, {
        excludeExtraneousValues: true,
      }),
      likedAt: like.createdAt, //? Include when user liked it
    }));
    return {
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  //TODO ==================== TOGGLE BOOKMARK ====================
  async toggleBookmark(
    postId: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Check if post exists
      const post = await this.postRepo.findOneBy({ id: postId });
      if (!post) throw new NotFoundException('Post not found');

      //* 2. Check for existing bookmark
      const existingBookmark = await this.bookmarkRepo.findOne({
        where: { post: { id: postId }, user: { id: userId } },
        withDeleted: true,
      });

      let action: 'BOOKMARKED' | 'UNBOOKMARKED';

      if (existingBookmark && !existingBookmark.deletedAt) {
        //* 3. Remove bookmark
        await queryRunner.manager.softDelete(Bookmark, existingBookmark.id);
        action = 'UNBOOKMARKED';
      } else if (existingBookmark && existingBookmark.deletedAt) {
        //* 4. Restore bookmark
        await queryRunner.manager.restore(Bookmark, existingBookmark.id);
        action = 'BOOKMARKED';
      } else {
        //* 5. Create new bookmark
        const newBookmark = this.bookmarkRepo.create({
          post: { id: postId },
          user: { id: userId },
        });
        await queryRunner.manager.save(Bookmark, newBookmark);
        action = 'BOOKMARKED';
      }

      await queryRunner.commitTransaction();

      //* 6. Audit log
      await this.auditService.createLog({
        action:
          action === 'BOOKMARKED'
            ? AuditAction.POST_BOOKMARKED
            : AuditAction.POST_UNBOOKMARKED,
        resource: AuditResource.POST,
        userId,
        ip,
        userAgent,
        metadata: { postId, action },
      });

      return { status: action, postId };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET USER BOOKMARKS ====================
  async getUserBookmarks(userId: string, page: number = 1, limit: number = 20) {
    const [bookmarks, total] = await this.bookmarkRepo.findAndCount({
      where: { user: { id: userId } },
      relations: ['post', 'post.author', 'post.media'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const posts = bookmarks.map((bookmark) => ({
      ...plainToInstance(PostResponseDto, bookmark.post, {
        excludeExtraneousValues: true,
        exposeUnsetFields: false,
      }),
      bookmarkedAt: bookmark.createdAt, //? Include when user bookmarked it
    }));
    return {
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  //TODO ==================== CREATE REPLY ====================
  async createReply(
    postId: string,
    userId: string,
    createReplyDto: CreateReplyDto,
    files?: Express.Multer.File[],
    ip?: string,
    userAgent?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let uploadedResponse: {
      url: string;
      resourceType: string;
      publicId: string;
    }[] = [];

    try {
      //* 1. Check if post exists
      const post = await this.postRepo.findOne({
        where: {
          id: postId,
        },
        select: {
          id: true,
          authorId: true,
        },
      });
      if (!post) throw new NotFoundException('Post not found');

      //* 2. Validate parent reply if provided
      if (createReplyDto.parentReplyId) {
        const parentReply = await this.replyRepo.findOneBy({
          id: createReplyDto.parentReplyId,
        });
        if (!parentReply) throw new NotFoundException('Parent reply not found');
      }

      //* 3. Upload files if provided
      if (files && files.length > 0) {
        const uploadPromises = files.map((file) =>
          this.cloudinary.uploadFile(file),
        );
        const uploadResults = await Promise.all(uploadPromises);

        uploadedResponse = uploadResults.map((result, index) => ({
          url: result.secure_url || result.url,
          resourceType: result.resource_type,
          publicId: result.public_id,
          order: index,
        }));
      }

      //* 4. Create reply
      const reply = this.replyRepo.create({
        content: createReplyDto.content,
        post: { id: postId },
        author: { id: userId },
        parentReply: createReplyDto.parentReplyId
          ? { id: createReplyDto.parentReplyId }
          : undefined,
      });

      const savedReply = await queryRunner.manager.save(Reply, reply);

      //* 5. Save media if files exist
      if (uploadedResponse.length > 0) {
        const mediaEntities = uploadedResponse.map((media) =>
          this.mediaRepo.create({
            mediaUrl: media.url,
            publicId: media.publicId,
            resourceType: media.resourceType,
            reply: { id: savedReply.id },
          }),
        );
        await queryRunner.manager.save(Media, mediaEntities);
      }

      //* 6. Update reply counts
      if (createReplyDto.parentReplyId) {
        //? Increment parent reply's replyCount
        await queryRunner.manager.increment(
          Reply,
          { id: createReplyDto.parentReplyId },
          'replyCount',
          1,
        );
      } else {
        //? Increment post's replyCount for top-level replies
        await queryRunner.manager.increment(
          Post,
          { id: postId },
          'replyCount',
          1,
        );
      }
      await queryRunner.commitTransaction();
      //todo---<<<>> SEND NOTIFICATION TO AUTHOR, SOMEONE REPLIED YOUR POST
      //* 4.1 Send notification
      await this.notificationService.createNotification({
        type: NotificationType.REPLY,
        recipientId: savedReply.authorId,
        actorId: userId,
        postId: postId,
        replyId: savedReply.id,
      });

      //* <<<<<<<<<<<< EXTRACT MENTION & HASHTAG >>>>>>>>>>>>>>>>>>>>>>>
      const hashtags = this.hashTagService.extractHashtags(
        createReplyDto.content,
      );
      const mentions = this.mentionService.extractMentions(
        createReplyDto.content,
      );
      //*<><><><> Save hashtags and mentions

      if (hashtags.length > 0) {
        await this.hashTagService.createHashtags(hashtags, postId);
      }

      if (mentions.length > 0) {
        //* Will send notification inside the mention
        await this.mentionService.createMentions(
          mentions,
          postId,
          userId,
          savedReply.id,
        );
      }
      //* 7. Audit log
      await this.auditService.createLog({
        action: AuditAction.REPLY_CREATED,
        resource: AuditResource.REPLY,
        userId,
        ip,
        userAgent,
        metadata: {
          postId,
          replyId: savedReply.id,
          parentReplyId: createReplyDto.parentReplyId,
          mediaCount: uploadedResponse.length,
        },
      });

      const replyWithRelation = await this.getReplyWithRelations(savedReply.id);

      return plainToInstance(ReplyResponseDto, replyWithRelation, {
        excludeExtraneousValues: true,
        exposeUnsetFields: false,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();

      //* 8. Cleanup uploaded files on failure
      if (uploadedResponse.length > 0) {
        await Promise.allSettled(
          uploadedResponse.map((m) =>
            this.cloudinary.deleteFile(m.publicId, m.resourceType),
          ),
        );
      }
      console.log(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  /**
   * TODO =========<<<<<<<<<< UPDATE EXISTING REPLY ====================
   * @param postId
   * @param userId
   * @param updateDto
   * @param replyId
   * @param files
   * @param ip
   * @param userAgent
   * @returns
   */
  async patchReply(
    postId: string,
    userId: string,
    updateDto: UpdateReplyDto,
    replyId: string,
    files?: Express.Multer.File[],
    ip?: string,
    userAgent?: string,
  ) {
    const queryRunner = this.dataSource.manager.connection.createQueryRunner();
    queryRunner.connect();
    queryRunner.startTransaction();

    let uploadedResponse: {
      url: string;
      resourceType: string;
      publicId: string;
    }[] = [];
    try {
      //* 1.Check if that reply exist
      const originalReply = await this.replyRepo.findOne({
        where: {
          id: replyId,
        },
        select: {
          id: true,
          authorId: true,
          media: true,
        },
        relations: ['media'],
      });
      if (!originalReply) throw new NotFoundException('Reply not found');
      //* 2.Check if the given post exist
      const post = await this.postRepo.findOne({
        where: {
          id: postId,
        },
        select: {
          id: true,
          authorId: true,
        },
      });
      if (!post) throw new NotFoundException('Post not found');
      //* 3.Verify if the parent reply is available (if provided)
      if (updateDto.parentReplyId) {
        const parentReply = await this.replyRepo.findOne({
          where: {
            id: updateDto.parentReplyId,
          },
        });
        if (parentReply)
          throw new NotFoundException('Parent  reply not found not found');
      }
      //* 4.1Upload and delete old media files => if provided & available
      if (files && files.length > 0) {
        //* 4.1 Upload new media
        const uploadPromises = files.map((file) =>
          this.cloudinary.uploadFile(file),
        );
        //* ==> Parallel Upload
        const uploadResponse = await Promise.all(uploadPromises);
        uploadedResponse = uploadResponse.map((result) => ({
          url: result.secure_url || result.url,
          resourceType: result.resource_type,
          publicId: result.public_id,
        }));
        //* 4.2 Check if the original reply had media
        if (originalReply.media.length > 0) {
          //? Delete the old media files
          const allDeletePromises = originalReply.media.flatMap((media) => [
            //* Database delete
            queryRunner.manager.softDelete(Media, { id: media.id }),
            //* Cloudinary delete
            this.cloudinary.deleteFile(media.publicId, media.resourceType),
          ]);
          //* Execute ALL in parallel
          await Promise.allSettled(allDeletePromises);
        }
      }
      //* 5.Update the existing reply
      const reply = this.replyRepo.create({
        content: updateDto.content,
        parentReply: updateDto.parentReplyId
          ? { id: updateDto.parentReplyId }
          : undefined,
        post: { id: postId },
        author: { id: userId },
      });
      await queryRunner.manager.update(Reply, { id: replyId }, reply);
      const updatedReply = await this.replyRepo.findOne({
        where: { id: replyId },
      });
      //* 6.Save media files if they exist
      if (updatedReply && uploadedResponse.length > 0) {
        const mediaEntities = uploadedResponse.map((media) =>
          this.mediaRepo.create({
            mediaUrl: media.url,
            publicId: media.publicId,
            resourceType: media.resourceType,
            reply: { id: updatedReply.id },
          }),
        );
        await queryRunner.manager.save(Media, mediaEntities);
      }
      if (!updatedReply)
        throw new ConflictException('Post could not be updated');
      await queryRunner.commitTransaction();
      //todo---<<<>> SEND NOTIFICATION TO AUTHOR, SOMEONE REPLIED YOUR POST
      //* 4.1 Send notification
      await this.notificationService.createNotification({
        type: NotificationType.REPLY,
        recipientId: updatedReply.authorId,
        actorId: userId,
        postId: postId,
        replyId: updatedReply.id,
      });
      //* <<<<<<<<<<<< EXTRACT MENTION & HASHTAG >>>>>>>>>>>>>>>>>>>>>>>
      const hashtags = this.hashTagService.extractHashtags(updateDto.content);
      const mentions = this.mentionService.extractMentions(updateDto.content);
      //*<><><><> Save hashtags and mentions

      if (hashtags.length > 0) {
        await this.hashTagService.createHashtags(hashtags, postId);
      }
      if (mentions.length > 0) {
        //* Will send notification inside the mention
        await this.mentionService.createMentions(
          mentions,
          postId,
          userId,
          updatedReply.id,
        );
      }
      //* 7. Audit log
      await this.auditService.createLog({
        action: AuditAction.REPLY_UPDATED,
        resource: AuditResource.REPLY,
        userId,
        ip,
        userAgent,
        metadata: {
          postId,
          replyId: updatedReply.id,
          parentReplyId: updateDto.parentReplyId,
          mediaCount: uploadedResponse.length,
        },
      });

      const replyWithRelation = await this.getReplyWithRelations(
        updatedReply.id,
      );
      return plainToInstance(ReplyResponseDto, replyWithRelation, {
        excludeExtraneousValues: true,
        exposeUnsetFields: false,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();

      //* 8. Cleanup uploaded files on failure
      if (uploadedResponse.length > 0) {
        await Promise.allSettled(
          uploadedResponse.map((m) =>
            this.cloudinary.deleteFile(m.publicId, m.resourceType),
          ),
        );
      }
      console.log(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET POST REPLIES ====================
  async getPostReplies(postId: string, page: number = 1, limit: number = 20) {
    //* 1. Check if post exists
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post not found');

    //* 2. Get top-level replies (where parentReplyId is null)
    const [replies, total] = await this.replyRepo.findAndCount({
      where: {
        post: { id: postId },
        parentReply: IsNull(), // Only top-level replies
      },
      relations: ['author', 'media'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const newReplies = plainToInstance(ReplyResponseDto, replies, {
      excludeExtraneousValues: true,
      exposeUnsetFields: false,
    });
    return {
      replies: newReplies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  //TODO ==================== GET REPLY REPLIES ====================
  async getReplyReplies(replyId: string, page: number = 1, limit: number = 20) {
    //* 1. Check if parent reply exists
    const parentReply = await this.replyRepo.findOneBy({ id: replyId });
    if (!parentReply) throw new NotFoundException('Parent reply not found');

    //* 2. Get nested replies
    const [replies, total] = await this.replyRepo.findAndCount({
      where: { parentReply: { id: replyId } },
      relations: ['author', 'media'],
      order: { createdAt: 'ASC' }, // ?Chronological for nested replies
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      replies: plainToInstance(ReplyResponseDto, replies, {
        excludeExtraneousValues: true,
        exposeUnsetFields: true,
      }),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  //TODO ==================== DELETE REPLY ====================
  async deleteReply(
    replyId: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Find reply and verify ownership
      const reply = await this.replyRepo.findOne({
        where: { id: replyId },
        relations: ['author', 'media', 'post'],
      });
      if (!reply) throw new NotFoundException('Reply not found');
      if (reply.author.id !== userId)
        throw new ForbiddenException('Not your reply');

      //* 2. Delete media from Cloudinary
      if (reply.media?.length > 0) {
        await Promise.allSettled(
          reply.media.map((media) =>
            this.cloudinary.deleteFile(media.publicId, media.resourceType),
          ),
        );
      }

      //* 3. Update reply counts before deletion
      if (reply.parentReplyId) {
        //? Decrement parent reply's replyCount
        await queryRunner.manager.decrement(
          Reply,
          { id: reply.parentReplyId },
          'replyCount',
          1,
        );
      } else {
        //? Decrement post's replyCount for top-level replies
        await queryRunner.manager.decrement(
          Post,
          { id: reply.post.id },
          'replyCount',
          1,
        );
      }

      //* 4. Soft delete reply
      await queryRunner.manager.softDelete(Reply, replyId);
      await queryRunner.commitTransaction();

      //* 5. Audit log
      await this.auditService.createLog({
        action: AuditAction.REPLY_DELETED,
        resource: AuditResource.REPLY,
        userId,
        ip,
        userAgent,
        metadata: { replyId, mediaCount: reply.media?.length || 0 },
      });

      return { message: 'Reply deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== CREATE REPOST ====================
  async createRepost(
    postId: string,
    userId: string,
    createRepostDto?: CreateRepostDto,
    ip?: string,
    userAgent?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Check if post exists
      const originalPost = await this.postRepo.findOneBy({ id: postId });
      if (!originalPost) throw new NotFoundException('Post not found');

      //* 2. Check for existing repost
      const existingRepost = await this.repostRepo.findOne({
        where: {
          originalPost: { id: postId },
          user: { id: userId },
        },
        withDeleted: true,
      });

      let action: 'REPOSTED' | 'UNREPOSTED';

      if (existingRepost && !existingRepost.deletedAt) {
        //* 3. Remove repost & decrement the count
        await queryRunner.manager.softDelete(Repost, existingRepost.id);
        await queryRunner.manager.decrement(
          Post,
          { id: postId },
          'repostCount',
          1,
        );
        action = 'UNREPOSTED';
      } else if (existingRepost && existingRepost.deletedAt) {
        //* 4. Restore repost
        await queryRunner.manager.restore(Repost, existingRepost.id);
        await queryRunner.manager.increment(
          Post,
          { id: postId },
          'repostCount',
          1,
        );
        action = 'REPOSTED';
        //* 4.1 Send notification
        await this.notificationService.createNotification({
          type: NotificationType.REPOST,
          recipientId: originalPost.author.id,
          actorId: userId,
          postId: postId,
        });
      } else {
        //* 5. Create new repost
        const newRepost = this.repostRepo.create({
          originalPost: { id: postId },
          user: { id: userId },
          content: createRepostDto?.content,
        });
        await queryRunner.manager.save(Repost, newRepost);
        await queryRunner.manager.increment(
          Post,
          { id: postId },
          'repostCount',
          1,
        );
        action = 'REPOSTED';
        //* 5.1 Send notification
        await this.notificationService.createNotification({
          type: NotificationType.REPOST,
          recipientId: originalPost.authorId,
          actorId: userId,
          postId: postId,
        });
      }

      await queryRunner.commitTransaction();

      //* 6. Audit log
      await this.auditService.createLog({
        action:
          action === 'REPOSTED'
            ? AuditAction.POST_REPOSTED
            : AuditAction.POST_UNREPOSTED,
        resource: AuditResource.REPOST,
        userId,
        ip,
        userAgent,
        metadata: { postId, action, hasContent: !!createRepostDto?.content },
      });

      return { status: action, postId };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET POST REPOSTS ====================
  async getPostReposts(postId: string, page: number = 1, limit: number = 20) {
    //* 1. Check if post exists
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post not found');

    //* 2. Get reposts with user details
    const [reposts, total] = await this.repostRepo.findAndCount({
      where: { originalPost: { id: postId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      reposts: reposts.map((repost) => ({
        user: plainToInstance(UserResponseDto, repost.user, {
          excludeExtraneousValues: true,
          exposeUnsetFields: false,
        }),
        content: repost.content,
        repostedAt: repost.createdAt,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  //TODO ==================== GET USER REPOSTS ====================
  async getUserReposts(userId: string, page: number = 1, limit: number = 20) {
    const [reposts, total] = await this.repostRepo.findAndCount({
      where: { user: { id: userId } },
      relations: ['originalPost', 'originalPost.author', 'originalPost.media'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const posts = reposts.map((repost) => ({
      ...plainToInstance(PostResponseDto, repost.originalPost, {
        excludeExtraneousValues: true,
        exposeUnsetFields: false,
      }),
      repostContent: repost.content, //? Include repost commentary
      repostedAt: repost.createdAt, //? Include when user reposted it
    }));

    return {
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  //? ==================== UTILITY METHODS ====================

  //* Get reply with all relations
  private async getReplyWithRelations(replyId: string) {
    return this.replyRepo.findOne({
      where: { id: replyId },
      relations: ['author', 'media', 'post'],
      order: { media: { createdAt: 'ASC' } },
    });
  }
}
