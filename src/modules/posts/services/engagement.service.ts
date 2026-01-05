import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, QueryRunner, Repository } from 'typeorm';
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
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { HashtagService } from './hashtag.service';
import { PostStatusService } from './post-status.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

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
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,

    //* Services
    private readonly auditService: AuditLogService,
    private readonly cloudinary: CloudinaryService,
    private readonly dataSource: DataSource,
    private readonly mentionService: MentionService,
    private readonly notificationService: NotificationsService,
    private readonly hashTagService: HashtagService,
    private readonly postStatusService: PostStatusService,
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
      //* 0.Invalidate the cached post
      const cachedKey = `post:${postId}:viewer:${userId}`;
      await this.cacheManager.del(cachedKey);
      //* 1. Check if post exists
      const post = await this.postRepo.findOne({
        where: { id: postId },
        relations: ['author'],
      });
      if (!post) throw new NotFoundException('Post not found');
      const feedKey = `userposts:${post.author.username}:viewer:${userId}`;
      await this.cacheManager.del(feedKey);
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
    //* 1.Get all liked posts by this user
    const [likes, total] = await this.likeRepo.findAndCount({
      where: { user: { id: userId }, post: { id: Not(IsNull()) } },
      relations: ['post', 'post.author', 'post.media'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    //* 2.Get post status for all liked posts
    const postInfo = likes.map((like) => ({
      postId: like.post.id,
      authorId: like.post.authorId,
    }));
    const statusMap = await this.postStatusService.getPostsStatus(
      postInfo,
      userId,
    );

    const posts = likes.map((like) => ({
      ...plainToInstance(PostResponseDto, like.post, {
        excludeExtraneousValues: true,
      }),
      ...(statusMap[like.post.id] || {
        hasLiked: true,
        hasBookmarked: false,
        hasReposted: false,
        hasReplied: false,
        isFollowingAuthor: false,
      }),
      likedAt: like.createdAt, //? Include when user liked it
    }));

    return {
      posts,
      likeCount: total,
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
      //* 0.Invalidate the cached post
      const cachedKey = `post:${postId}:viewer:${userId}`;
      await this.cacheManager.del(cachedKey);
      //* 1. Check if post exists
      const post = await this.postRepo.findOne({
        where: { id: postId },
        relations: ['author'],
      });
      if (!post) throw new NotFoundException('Post not found');
      const feedKey = `userposts:${post.author.username}:viewer:${userId}`;
      await this.cacheManager.del(feedKey);
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
  async getUserBookmarks(userId: string, page: number = 1, limit: number = 5) {
    try {
      //* 1.Get bookmarks and total count
      const [bookmarks, total] = await this.bookmarkRepo.findAndCount({
        where: { user: { id: userId }, post: { id: Not(IsNull()) } },
        relations: ['post', 'post.author', 'post.media'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      //* 2.Get post status for all bookmarked posts
      const bookmarkInfo = bookmarks.map((bookmark) => ({
        postId: bookmark.postId,
        authorId: bookmark.post.authorId,
      }));
      const statusMap = await this.postStatusService.getPostsStatus(
        bookmarkInfo,
        userId,
      );

      const posts = bookmarks.map((bookmark) => ({
        ...plainToInstance(PostResponseDto, bookmark.post, {
          excludeExtraneousValues: true,
          exposeUnsetFields: false,
        }),
        ...(statusMap[bookmark.post.id] || {
          hasLiked: false,
          hasBookmarked: true,
          hasReposted: false,
          hasReplied: false,
          isFollowingAuthor: false,
        }),
        bookmarkedAt: bookmark.createdAt, //? Include when user bookmarked it
      }));
      return {
        posts,
        bookmarkCount: total,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  //TODO ==================== PRIVATE HELPER FUNCTIONS ====================

  /**
   *todo-> Upload files to Cloudinary and return structured upload response
   */
  private async uploadFilesToCloudinary(files: Express.Multer.File[]) {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map((file) =>
      this.cloudinary.uploadFile(file),
    );
    const uploadResults = await Promise.all(uploadPromises);

    return uploadResults.map((result) => ({
      url: result.secure_url || result.url,
      resourceType: result.resource_type,
      publicId: result.public_id,
    }));
  }

  /**
   *todo-> Delete files from Cloudinary
   */
  private async deleteFilesFromCloudinary(
    uploadedMedia: { publicId: string; resourceType: string }[],
  ) {
    if (!uploadedMedia || uploadedMedia.length === 0) return;

    await Promise.allSettled(
      uploadedMedia.map((m) =>
        this.cloudinary.deleteFile(m.publicId, m.resourceType),
      ),
    );
  }

  /**
   *todo-----> Save media entities to database
   */
  private async saveMediaEntities(
    queryRunner: QueryRunner,
    uploadedMedia: { url: string; publicId: string; resourceType: string }[],
    replyId: string,
  ) {
    if (!uploadedMedia || uploadedMedia.length === 0) return;

    const mediaEntities = uploadedMedia.map((media) =>
      this.mediaRepo.create({
        mediaUrl: media.url,
        publicId: media.publicId,
        resourceType: media.resourceType,
        reply: { id: replyId },
      }),
    );
    await queryRunner.manager.save(Media, mediaEntities);
  }

  /**
   *todo=> Update reply count for parent reply or post
   */
  private async updateReplyCount(
    queryRunner: QueryRunner,
    postId: string,
    parentReplyId: string | undefined,
    increment: number,
  ) {
    if (parentReplyId) {
      await queryRunner.manager.increment(
        Reply,
        { id: parentReplyId },
        'replyCount',
        increment,
      );
    } else {
      await queryRunner.manager.increment(
        Post,
        { id: postId },
        'replyCount',
        increment,
      );
    }
  }

  /**
   *todo===> Process mentions and hashtags from content
   */
  private async processMentionsAndHashtags(
    content: string | undefined,
    postId: string,
    userId: string,
    replyId: string,
  ) {
    if (!content) return;

    const hashtags = this.hashTagService.extractHashtags(content);
    const mentions = this.mentionService.extractMentions(content);

    if (hashtags.length > 0) {
      await this.hashTagService.createHashtags(hashtags, postId);
    }

    if (mentions.length > 0) {
      await this.mentionService.createMentions(
        mentions,
        postId,
        userId,
        replyId,
      );
    }
  }

  /**
   *todo========> Delete old media and upload new media for reply update
   */
  private async updateReplyMedia(
    queryRunner: QueryRunner,
    originalMedia: Media[],
    newFiles: Express.Multer.File[] | undefined,
  ) {
    if (newFiles && newFiles.length > 0) {
      const uploadedMedia = await this.uploadFilesToCloudinary(newFiles);

      if (originalMedia.length > 0) {
        const allDeletePromises = originalMedia.flatMap((media) => [
          queryRunner.manager.softDelete(Media, { id: media.id }),
          this.cloudinary.deleteFile(media.publicId, media.resourceType),
        ]);
        await Promise.allSettled(allDeletePromises);
      }

      return uploadedMedia;
    }

    return [];
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
      //* 0.Invalidate the cached post
      const cachedKey = `post:${postId}:viewer:${userId}`;
      await this.cacheManager.del(cachedKey);
      //* 1. Check if post exists
      const post = await this.postRepo.findOne({
        where: { id: postId },
        select: { id: true, authorId: true },
        relations: ['author'],
      });
      if (!post) throw new NotFoundException('Post not found');
      //* Invalidate cached feed
      const feedKey = `userposts:${post.author.username}:viewer:${userId}`;
      await this.cacheManager.del(feedKey);
      //* 2. Validate parent reply if provided
      if (createReplyDto.parentReplyId) {
        const parentReply = await this.replyRepo.findOneBy({
          id: createReplyDto.parentReplyId,
        });
        if (!parentReply) throw new NotFoundException('Parent reply not found');
      }

      //* 3. Validate content/media
      if (!createReplyDto.content && !files)
        throw new BadRequestException('Content or image should exist');

      //* 4. Upload files if provided
      uploadedResponse = await this.uploadFilesToCloudinary(files!);

      //* 5. Create and save reply
      const reply = this.replyRepo.create({
        content: createReplyDto.content,
        post: { id: postId },
        author: { id: userId },
        parentReply: createReplyDto.parentReplyId
          ? { id: createReplyDto.parentReplyId }
          : undefined,
      });
      const savedReply = await queryRunner.manager.save(Reply, reply);

      //* 6. Save media
      await this.saveMediaEntities(
        queryRunner,
        uploadedResponse,
        savedReply.id,
      );

      //* 7. Update reply counts
      await this.updateReplyCount(
        queryRunner,
        postId,
        createReplyDto.parentReplyId,
        1,
      );

      await queryRunner.commitTransaction();

      //* 8. Send notification
      await this.notificationService.createNotification({
        type: NotificationType.REPLY,
        recipientId: post.authorId,
        actorId: userId,
        postId: postId,
        replyId: savedReply.id,
        metadata: { content: savedReply.content },
      });

      //* 9. Process mentions and hashtags
      await this.processMentionsAndHashtags(
        createReplyDto.content,
        postId,
        userId,
        savedReply.id,
      );

      //* 10. Audit log
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
      await this.deleteFilesFromCloudinary(uploadedResponse);
      console.log(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  /**
   * Update existing reply
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
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let uploadedResponse: {
      url: string;
      resourceType: string;
      publicId: string;
    }[] = [];

    try {
      //* 1. Check if reply exists
      const originalReply = await this.replyRepo.findOne({
        where: { id: replyId },
        select: { id: true, authorId: true, media: true },
        relations: ['media'],
      });
      if (!originalReply) throw new NotFoundException('Reply not found');

      //* 2. Check if post exists
      const post = await this.postRepo.findOne({
        where: { id: postId },
        select: { id: true, authorId: true },
      });
      if (!post) throw new NotFoundException('Post not found');
      //* 3. Validate parent reply if provided
      if (updateDto.parentReplyId) {
        const parentReply = await this.replyRepo.findOneBy({
          id: updateDto.parentReplyId,
        });
        if (!parentReply) throw new NotFoundException('Parent reply not found');
      }

      //* 4. Validate content/media
      if (!updateDto.content?.trim() && (!files || files.length === 0))
        throw new BadRequestException('Content or File is needed');

      //* 5. Update media (delete old, upload new)
      uploadedResponse = await this.updateReplyMedia(
        queryRunner,
        originalReply.media,
        files,
      );

      //* 6. Update reply
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
      if (!updatedReply)
        throw new ConflictException('Reply could not be updated');

      //* 7. Save new media
      await this.saveMediaEntities(
        queryRunner,
        uploadedResponse,
        updatedReply.id,
      );

      await queryRunner.commitTransaction();

      //* 8. Send notification
      await this.notificationService.createNotification({
        type: NotificationType.REPLY,
        recipientId: updatedReply.authorId,
        actorId: userId,
        postId: postId,
        replyId: updatedReply.id,
        metadata: { content: updatedReply.content },
      });

      //* 9. Process mentions and hashtags
      await this.processMentionsAndHashtags(
        updateDto.content,
        postId,
        userId,
        updatedReply.id,
      );

      //* 10. Audit log
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
      await this.deleteFilesFromCloudinary(uploadedResponse);
      console.log(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET POST REPLIES ====================
  async getPostReplies(postId: string, page: number = 1, limit: number = 20) {
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post not found');

    const queryBuilder = this.replyRepo
      .createQueryBuilder('reply')
      .leftJoinAndSelect('reply.author', 'author')
      .leftJoinAndSelect('reply.media', 'media')
      //* Sub-query to count direct children
      .loadRelationCountAndMap(
        'reply.directDescendantsCount',
        'reply.replies',
        'children',
        (qb) => qb.where('children.parentReplyId IS NOT NULL'),
      )
      .where('reply.postId = :postId', { postId })
      .andWhere('reply.parentReplyId IS NULL') // Only top-level
      .orderBy('reply.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [replies, total] = await queryBuilder.getManyAndCount();

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

    //* 2. Get nested replies with their own child counts
    const queryBuilder = this.replyRepo
      .createQueryBuilder('reply')
      .leftJoinAndSelect('reply.author', 'author')
      .leftJoinAndSelect('reply.media', 'media')
      .loadRelationCountAndMap('reply.directDescendantsCount', 'reply.replies')
      .where('reply.parentReplyId = :replyId', { replyId })
      .orderBy('reply.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [replies, total] = await queryBuilder.getManyAndCount();

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
    //* 0.Invalidate the cached post
    const cachedKey = `post:${postId}:viewer:${userId}`;
    await this.cacheManager.del(cachedKey);
    try {
      //* 1. Check if post exists
      const originalPost = await this.postRepo.findOne({
        where: { id: postId },
        relations: ['author'],
      });
      if (!originalPost) throw new NotFoundException('Post not found');

      const feedKey = `userposts:${originalPost.author.username}:viewer:${userId}`;
      await this.cacheManager.del(feedKey);
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
      } else if (
        existingRepost &&
        existingRepost.deletedAt &&
        createRepostDto?.content
      ) {
        //* 4. Restore & update  repost
        await queryRunner.manager.restore(Repost, existingRepost.id);
        await queryRunner.manager.update(Repost, existingRepost.id, {
          content: createRepostDto.content,
        });
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
          recipientId: originalPost.authorId,
          actorId: userId,
          postId: postId,
        });
      } else if (
        existingRepost &&
        existingRepost.deletedAt &&
        !createRepostDto?.content
      ) {
        //* 4. Restore & update  repost
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
          recipientId: originalPost.authorId,
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
    try {
      const queryBuilder = this.repostRepo
        .createQueryBuilder('repost')
        .leftJoinAndSelect('repost.originalPost', 'originalPost')
        .leftJoinAndSelect('originalPost.author', 'author')
        .leftJoinAndSelect('originalPost.media', 'media')
        .where('repost.userId = :userId', { userId })
        .andWhere('originalPost.id IS NOT NULL')
        .andWhere('originalPost.deletedAt IS NULL') //? Exclude soft-deleted posts
        .orderBy('repost.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [reposts, total] = await queryBuilder.getManyAndCount();

      //* Get post status for all reposted posts
      const postIds = reposts.map((repost) => ({
        postId: repost.originalPostId,
        authorId: repost.originalPost.authorId,
      }));
      const statusMap = await this.postStatusService.getPostsStatus(
        postIds,
        userId,
      );

      const posts = reposts.map((repost) => ({
        ...plainToInstance(PostResponseDto, repost.originalPost, {
          excludeExtraneousValues: true,
          exposeUnsetFields: false,
        }),
        ...(statusMap[repost.originalPostId] || {
          hasLiked: false,
          hasBookmarked: false,
          hasReposted: true,
          hasReplied: false,
          isFollowingAuthor: false,
        }),
        repostContent: repost.content, //? Include repost commentary
        repostedAt: repost.createdAt, //? Include when user reposted it
      }));

      return {
        posts,
        totalReposts: total,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
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
