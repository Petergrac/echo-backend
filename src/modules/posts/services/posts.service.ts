import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post, PostVisibility } from '../entities/post.entity';
import { DataSource, Repository } from 'typeorm';
import { AuditLogService } from '../../../common/services/audit.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service';
import { Media } from '../entities/media.entity';
import { User } from '../../auth/entities/user.entity';
import { AuditAction, AuditResource } from '../../../common/enums/audit.enums';
import { plainToInstance } from 'class-transformer';
import { PostResponseDto } from '../dto/post-response.dto';
import { HashtagService } from './hashtag.service';
import { MentionService } from './mention.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly auditService: AuditLogService,
    private readonly cloudinary: CloudinaryService,
    private readonly dataSource: DataSource,
    private readonly hashTagService: HashtagService,
    private readonly mentionService: MentionService,
  ) {}

  //TODO ==================== CREATE POST ====================
  async createPost(
    userId: string,
    cdto: CreatePostDto,
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
      //* 1. Upload files to Cloudinary in parallel for better performance
      if (files && files.length > 0) {
        const uploadPromises = files.map((file) =>
          this.cloudinary.uploadFile(file),
        );
        const uploadResults = await Promise.all(uploadPromises);

        uploadedResponse = uploadResults.map((result) => ({
          url: result.secure_url || result.url,
          resourceType: result.resource_type,
          publicId: result.public_id,
        }));
      }

      //* 2. Create and save post
      const post = this.postRepo.create({
        content: cdto.content,
        visibility: cdto.visibility,
        author: { id: userId },
        mediaCount: uploadedResponse.length,
      });
      const savedPost = await queryRunner.manager.save(Post, post);
      //* 3. Save media entities if files exist
      if (uploadedResponse.length > 0) {
        const mediaEntities = uploadedResponse.map((media) =>
          this.mediaRepo.create({
            mediaUrl: media.url,
            publicId: media.publicId,
            resourceType: media.resourceType,
            post: { id: savedPost.id },
          }),
        );
        await queryRunner.manager.save(Media, mediaEntities);
      }

      //* 4. Commit transaction
      await queryRunner.commitTransaction();
      //* <<<<<<<<<<<< EXTRACT MENTION & HASHTAG >>>>>>>>>>>>>>>>>>>>>>>
      const hashtags = this.hashTagService.extractHashtags(cdto.content);
      const mentions = this.mentionService.extractMentions(cdto.content);
      //*<><><><> Save hashtags and mentions

      if (hashtags.length > 0) {
        await this.hashTagService.createHashtags(hashtags, savedPost.id);
      }

      if (mentions.length > 0) {
        //* Will send notification inside the mention
        await this.mentionService.createMentions(
          mentions,
          savedPost.id,
          userId,
        );
      }
      //* 5. Audit log
      await this.auditService.createLog({
        action: AuditAction.POST_CREATED,
        resource: AuditResource.POST,
        userId,
        ip,
        userAgent,
        metadata: { postId: savedPost.id, mediaCount: uploadedResponse.length },
      });

      //* 6. Transform & Return post with relations
      const postWithRelations = this.getPostWithRelations(savedPost.id);
      return plainToInstance(PostResponseDto, postWithRelations, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();

      //* 7. Cleanup uploaded files if transaction fails
      if (uploadedResponse.length > 0) {
        await Promise.allSettled(
          uploadedResponse.map((m) =>
            this.cloudinary.deleteFile(m.publicId, m.resourceType),
          ),
        );
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET SINGLE POST ====================
  async getPost(
    postId: string,
    viewerId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    //* 1. Find post with relations
    const post = await this.getPostWithRelations(postId);
    if (!post) throw new NotFoundException('Post not found');

    //* 2. Validate post visibility
    const canView = await this.validatePostVisibility(post, viewerId);
    if (!canView) throw new ForbiddenException('You cannot view this post');

    //* 3. Increment view count (fire and forget)
    this.incrementViewCount(postId).catch(console.error);

    //* 4. Audit log view
    await this.auditService.createLog({
      action: AuditAction.POST_VIEWED,
      resource: AuditResource.POST,
      userId: viewerId,
      ip,
      userAgent,
      metadata: { postId },
    });

    return plainToInstance(PostResponseDto, post, {
      excludeExtraneousValues: true,
    });
  }

  //TODO ==================== UPDATE POST ====================
  async updatePost(
    postId: string,
    userId: string,
    udto: UpdatePostDto,
    files?: Express.Multer.File[],
    ip?: string,
    userAgent?: string,
  ) {
    //* 1. Find post and verify ownership
    const post = await this.checkPostPermissions(postId, userId);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 2. Handle media updates if files provided
      let mediaUpdates: Media[] = [];
      if (files && files.length > 0) {
        //* Delete existing media
        await this.deletePostMedia(postId);

        //* Upload new media
        const uploadPromises = files.map((file) =>
          this.cloudinary.uploadFile(file),
        );
        const uploadResults = await Promise.all(uploadPromises);

        const uploadedMedia = uploadResults.map((result) =>
          this.mediaRepo.create({
            mediaUrl: result.secure_url || result.url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            post: { id: postId },
          }),
        );
        mediaUpdates = await queryRunner.manager.save(Media, uploadedMedia);
      }

      //* 3. Update post fields
      await queryRunner.manager.update(Post, postId, {
        content: udto.content ?? post.content,
        visibility: udto.visibility ?? post.visibility,
        mediaCount: files ? mediaUpdates.length : post.mediaCount,
      });

      //* 3.1. Extract new hashtags and mentions if content changed
      if (udto.content) {
        const newHashtags = this.hashTagService.extractHashtags(udto.content);
        const newMentions = this.mentionService.extractMentions(udto.content);

        //* 3.2. Update hashtags (delete old, create new)
        if (newHashtags.length > 0) {
          await this.hashTagService.createHashtags(newHashtags, postId);
        }

        //* 3.3. Update mentions (delete old, create new)
        if (newMentions.length > 0) {
          await this.mentionService.createMentions(newMentions, postId, userId);
        }
      }
      await queryRunner.commitTransaction();

      //* 4. Audit log
      await this.auditService.createLog({
        action: AuditAction.POST_UPDATED,
        resource: AuditResource.POST,
        userId,
        ip,
        userAgent,
        metadata: { postId, changes: Object.keys(udto) },
      });
      const finalPost = this.getPostWithRelations(postId);
      return plainToInstance(PostResponseDto, finalPost, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== DELETE POST ====================
  async deletePost(
    postId: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Find post and verify ownership
      const post = await this.postRepo.findOne({
        where: { id: postId },
        relations: ['author', 'media'],
      });
      if (!post) throw new NotFoundException('Post not found');
      if (post.author.id !== userId)
        throw new ForbiddenException('Not your post');

      //* 2. Delete media from Cloudinary
      if (post.media?.length > 0) {
        await Promise.allSettled(
          post.media.map((media) =>
            this.cloudinary.deleteFile(media.publicId, media.resourceType),
          ),
        );
      }

      //* 3. Soft delete post
      await queryRunner.manager.softDelete(Post, postId);
      await queryRunner.commitTransaction();

      //* 4. Audit log
      await this.auditService.createLog({
        action: AuditAction.POST_DELETED,
        resource: AuditResource.POST,
        userId,
        ip,
        userAgent,
        metadata: { postId, mediaCount: post.media?.length || 0 },
      });

      return { message: 'Post deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET USER POSTS ====================
  async getUserPosts(
    username: string,
    page: number = 1,
    limit: number = 20,
    viewerId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    //* 1. Find user
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    //* 2. Build query based on visibility
    const query = this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.authorId = :userId', { userId: user.id })
      .andWhere('post.deletedAt IS NULL')
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    //* 3. Apply privacy filters
    if (viewerId !== user.id) {
      query.andWhere(
        '(post.visibility = :public OR post.visibility = :followers)',
        {
          public: 'public',
          followers: 'followers',
        },
      );
    }

    const [posts, total] = await query.getManyAndCount();

    //* 4. Audit log
    await this.auditService.createLog({
      action: AuditAction.POST_VIEWED,
      resource: AuditResource.POST,
      userId: viewerId,
      ip,
      userAgent,
      metadata: { targetUsername: username, page, limit },
    });

    return {
      posts: plainToInstance(PostResponseDto, posts, {
        excludeExtraneousValues: true,
        exposeUnsetFields: false,
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

  //TODO ==================== GET USER FEED ====================
  async getFeed(userId: string, page: number = 1, limit: number = 20) {
    //* 1. Get posts from followed users + own posts
    const [posts, total] = await this.postRepo
      .createQueryBuilder('post')
      .innerJoin('post.author', 'author')
      .leftJoin(
        'author.followers',
        'followers',
        'followers.followerId = :userId',
        { userId },
      )
      .leftJoinAndSelect('post.media', 'media')
      .leftJoin('post.author', 'postAuthor')
      .where('post.deletedAt IS NULL')
      .andWhere('(post.authorId = :userId OR followers.followerId = :userId)', {
        userId,
      })
      .andWhere('(post.visibility = :public OR post.visibility = :followers)', {
        public: 'public',
        followers: 'followers',
      })
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      posts: plainToInstance(PostResponseDto, posts, {
        excludeExtraneousValues: true,
        exposeUnsetFields: false,
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

  //? ==================== UTILITY METHODS ====================

  //* Get post with all relations
  private async getPostWithRelations(postId: string) {
    return this.postRepo.findOne({
      where: { id: postId },
      relations: ['author', 'media'],
      order: { media: { createdAt: 'DESC' } },
    });
  }

  //* Increment view count (non-blocking)
  private async incrementViewCount(postId: string) {
    try {
      await this.postRepo.increment({ id: postId }, 'viewCount', 1);
    } catch (error) {
      console.log(error);
    }
  }

  //* Validate post visibility
  private async validatePostVisibility(
    post: Post,
    viewerId?: string,
  ): Promise<boolean> {
    if (post.visibility === PostVisibility.PUBLIC) return true;
    if (!viewerId) return false;
    if (post.author.id === viewerId) return true;
    if (post.visibility === PostVisibility.FOLLOWERS) {
      const isFollowing = await this.userRepo
        .createQueryBuilder('user')
        .innerJoin(
          'user.following',
          'following',
          'following.followingId = :authorId',
          {
            authorId: post.author.id,
          },
        )
        .where('user.id = :viewerId', { viewerId })
        .getCount();
      return isFollowing > 0;
    }
    return false;
  }

  //* Delete all media for a post
  private async deletePostMedia(postId: string) {
    const media = await this.mediaRepo.find({
      where: { post: { id: postId } },
    });
    if (media.length > 0) {
      //? Delete from Cloudinary
      await Promise.allSettled(
        media.map((m) =>
          this.cloudinary.deleteFile(m.publicId, m.resourceType),
        ),
      );
      //? Delete from database
      await this.mediaRepo.delete({ post: { id: postId } });
    }
  }

  //* Check post permissions for update/delete
  private async checkPostPermissions(postId: string, userId: string) {
    try {
      const post = await this.postRepo.findOne({
        where: { id: postId },
        relations: ['author'],
      });
      if (!post) throw new NotFoundException('Post not found');
      if (post.author.id !== userId)
        throw new ForbiddenException('Not your post');
      return post;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
