import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as argon2 from 'argon2';
import { config } from 'dotenv';

// Load environment variables
config();

// Import your entities
import { User } from '../src/modules/auth/entities/user.entity';
import {
  Post,
  PostVisibility,
} from '../src/modules/posts/entities/post.entity';
import { Media } from '../src/modules/posts/entities/media.entity';
import { Bookmark } from '../src/modules/posts/entities/bookmark.entity';
import { Reply } from '../src/modules/posts/entities/reply.entity';
import { Repost } from '../src/modules/posts/entities/repost.entity';
import { Hashtag } from '../src/modules/posts/entities/hashtag.entity';
import { PostHashtag } from '../src/modules/posts/entities/hashtag.entity';
import { Mention } from '../src/modules/posts/entities/mention.entity';
import { Follow } from '../src/modules/users/follow/entities/follow.entity';
import { Like } from '../src/modules/posts/entities/post-like.entity';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';
import { EmailToken } from '../src/modules/auth/entities/email-token.entity';
import { NotificationPreferences } from '../src/modules/notifications/entities/notification-preferences.entity';

class DatabaseSeeder {
  private dataSource: DataSource;
  private readonly TOTAL_USERS = 20;
  private readonly POSTS_PER_USER = 5;
  private readonly MAX_FOLLOWS_PER_USER = 10;
  private readonly MAX_LIKES_PER_POST = 5;
  private readonly MAX_REPLIES_PER_POST = 3;
  private readonly MAX_REPOSTS_PER_POST = 2;

  // Popular hashtags for realistic content
  private readonly POPULAR_HASHTAGS = [
    'programming',
    'javascript',
    'typescript',
    'webdev',
    'react',
    'nodejs',
    'python',
    'java',
    'coding',
    'developer',
    'software',
    'tech',
    'opensource',
    'github',
    'docker',
    'kubernetes',
    'aws',
    'cloud',
    'machinelearning',
    'ai',
    'datascience',
    'cybersecurity',
    'blockchain',
    'mobile',
    'ios',
    'android',
    'flutter',
    'reactnative',
    'uiux',
    'design',
    'creative',
    'art',
    'photography',
    'music',
    'gaming',
    'fitness',
    'health',
    'travel',
    'food',
    'fashion',
    'business',
    'startup',
    'entrepreneur',
    'marketing',
    'finance',
    'crypto',
    'climate',
    'sustainability',
    'education',
    'learning',
    'career',
  ];

  constructor() {
    this.dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        User,
        Post,
        Media,
        Like,
        Bookmark,
        Reply,
        Repost,
        Hashtag,
        PostHashtag,
        Mention,
        Follow,
        NotificationPreferences,
        RefreshToken,
        EmailToken,
      ],

      synchronize: false,
      logging: false,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  async initialize() {
    try {
      await this.dataSource.initialize();
      console.log('📊 Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  async destroy() {
    await this.dataSource.destroy();
  }

  //TODO ==================== CLEAR EXISTING DATA ====================
  async clearDatabase() {
    console.log('🗑️  Clearing existing data...');

    // Clear in correct order to respect foreign keys
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.query(`DELETE FROM "${entity.tableName}" WHERE 1=1;`);
    }

    console.log('✅ Database cleared successfully');
  }

  //TODO ==================== CREATE USERS ====================
  async createUsers(): Promise<User[]> {
    console.log('👥 Creating users...');
    const userRepository = this.dataSource.getRepository(User);
    const users: User[] = [];

    for (let i = 0; i < this.TOTAL_USERS; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const username = faker.internet
        .username({ firstName, lastName })
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 15);

      const user = userRepository.create({
        username: username + i, // Ensure uniqueness
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        passwordHash: await argon2.hash('password123'),
        firstName: `${firstName}`,
        lastName,
        bio: faker.person.bio(),
        avatar: faker.image.avatar(),
        avatarPublicId: `avatar_${i}`,
        website: faker.datatype.boolean(0.3) ? faker.internet.url() : undefined,
        location: faker.location.city() + ', ' + faker.location.country(),
        emailVerified: true,
        resourceType: 'image',
      });

      users.push(user);
    }

    // Save in batches to avoid memory issues
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await userRepository.save(batch);
      console.log(
        `✅ Saved users ${i + 1} to ${Math.min(i + batchSize, users.length)}`,
      );
    }

    console.log(`✅ Created ${users.length} users`);
    return users;
  }

  //TODO ==================== CREATE FOLLOWS ====================
  async createFollows(users: User[]) {
    console.log('🔗 Creating follow relationships...');
    const followRepository = this.dataSource.getRepository(Follow);
    const follows: Follow[] = [];

    for (const user of users) {
      const followCount = faker.number.int({
        min: 5,
        max: this.MAX_FOLLOWS_PER_USER,
      });

      // Get random users to follow (excluding self)
      const usersToFollow = faker.helpers.arrayElements(
        users.filter((u) => u.id !== user.id),
        followCount,
      );

      for (const userToFollow of usersToFollow) {
        const follow = followRepository.create({
          follower: user,
          following: userToFollow,
          createdAt: faker.date.past({ years: 1 }),
        });
        follows.push(follow);
      }
    }

    // Save in batches
    const batchSize = 100;
    for (let i = 0; i < follows.length; i += batchSize) {
      const batch = follows.slice(i, i + batchSize);
      await followRepository.save(batch);
    }

    console.log(`✅ Created ${follows.length} follow relationships`);
  }

  //TODO ==================== CREATE HASHTAGS ====================
  async createHashtags(): Promise<Hashtag[]> {
    console.log('🏷️  Creating hashtags...');
    const hashtagRepository = this.dataSource.getRepository(Hashtag);
    const hashtags: Hashtag[] = [];

    for (const tag of this.POPULAR_HASHTAGS) {
      const hashtag = hashtagRepository.create({
        tag,
        usageCount: faker.number.int({ min: 10, max: 500 }),
        postCount: faker.number.int({ min: 5, max: 200 }),
        trendScore: faker.number.int({ min: 0, max: 1000 }),
        lastUsedAt: faker.date.recent(),
      });
      hashtags.push(hashtag);
    }

    await hashtagRepository.save(hashtags);
    console.log(`✅ Created ${hashtags.length} hashtags`);
    return hashtags;
  }

  //TODO ==================== CREATE POSTS ====================
  async createPosts(users: User[], hashtags: Hashtag[]): Promise<Post[]> {
    console.log('📝 Creating posts...');
    const postRepository = this.dataSource.getRepository(Post);
    const posts: Post[] = [];
    const allPostHashtags: PostHashtag[] = [];
    const allMentions: Mention[] = [];

    const postHashtagRepository = this.dataSource.getRepository(PostHashtag);
    const mentionRepository = this.dataSource.getRepository(Mention);

    for (const user of users) {
      for (let i = 0; i < this.POSTS_PER_USER; i++) {
        // Generate post content with hashtags and mentions
        const content = this.generatePostContent(users, user.id);
        const hashtagsInPost = this.extractHashtagsFromContent(content);
        const mentionsInPost = this.extractMentionsFromContent(content);

        const post = postRepository.create({
          content,
          visibility: faker.helpers.arrayElement([
            PostVisibility.FOLLOWERS,
            PostVisibility.PUBLIC,
            PostVisibility.PUBLIC,
          ]), // Mostly public
          author: user,
          likeCount: 0, // Will be updated when likes are created
          replyCount: 0, // Will be updated when replies are created
          repostCount: 0, // Will be updated when reposts are created
          viewCount: faker.number.int({ min: 0, max: 1000 }),
          mediaCount: faker.datatype.boolean(0.4)
            ? faker.number.int({ min: 1, max: 4 })
            : 0, // 40% have media
          createdAt: faker.date.between({
            from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            to: new Date(),
          }),
        });
        posts.push(post);
      }
    }

    // Save posts in batches
    const postBatchSize = 100;
    for (let i = 0; i < posts.length; i += postBatchSize) {
      const batch = posts.slice(i, i + postBatchSize);
      await postRepository.save(batch);
      console.log(
        `✅ Saved posts ${i + 1} to ${Math.min(i + postBatchSize, posts.length)}`,
      );
    }

    console.log(`✅ Created ${posts.length} posts`);

    // Create post-hashtag relationships
    console.log('🔗 Linking hashtags to posts...');
    for (const post of posts) {
      const contentHashtags = this.extractHashtagsFromContent(post.content);
      const hashtagsToUse = faker.helpers.arrayElements(
        hashtags,
        faker.number.int({ min: 0, max: 5 }),
      );

      for (const hashtag of hashtagsToUse) {
        const postHashtag = postHashtagRepository.create({
          post,
          hashtag,
          createdAt: post.createdAt,
        });
        allPostHashtags.push(postHashtag);
      }

      // Also add hashtags from content if they match our popular ones
      for (const tag of contentHashtags) {
        const matchingHashtag = hashtags.find(
          (h) => h.tag === tag.toLowerCase(),
        );
        if (matchingHashtag) {
          const postHashtag = postHashtagRepository.create({
            post,
            hashtag: matchingHashtag,
            createdAt: post.createdAt,
          });
          allPostHashtags.push(postHashtag);
        }
      }
    }

    // Save post-hashtag relationships
    const hashtagBatchSize = 200;
    for (let i = 0; i < allPostHashtags.length; i += hashtagBatchSize) {
      const batch = allPostHashtags.slice(i, i + hashtagBatchSize);
      await postHashtagRepository.save(batch);
    }

    console.log(
      `✅ Created ${allPostHashtags.length} post-hashtag relationships`,
    );

    // Create mentions
    console.log('📍 Creating mentions...');
    for (const post of posts) {
      const mentions = this.extractMentionsFromContent(post.content);
      for (const username of mentions) {
        const mentionedUser = users.find(
          (u) => u.username === username.replace('@', ''),
        );
        if (mentionedUser && mentionedUser.id !== post.author.id) {
          const mention = mentionRepository.create({
            post,
            mentionedUser,
            author: post.author,
            createdAt: post.createdAt,
          });
          allMentions.push(mention);
        }
      }
    }

    // Save mentions in batches
    const mentionBatchSize = 200;
    for (let i = 0; i < allMentions.length; i += mentionBatchSize) {
      const batch = allMentions.slice(i, i + mentionBatchSize);
      await mentionRepository.save(batch);
    }

    console.log(`✅ Created ${allMentions.length} mentions`);

    return posts;
  }

  //TODO ==================== CREATE MEDIA ====================
  async createMedia(posts: Post[]) {
    console.log('🖼️  Creating media...');
    const mediaRepository = this.dataSource.getRepository(Media);
    const mediaItems: Media[] = [];

    for (const post of posts) {
      if (post.mediaCount > 0) {
        for (let i = 0; i < post.mediaCount; i++) {
          const mediaType = faker.helpers.arrayElement([
            'image',
            'image',
            'image',
            'video',
          ]); // Mostly images
          const media = mediaRepository.create({
            mediaUrl:
              mediaType === 'image'
                ? faker.image.urlPicsumPhotos()
                : 'https://example.com/video.mp4', // Placeholder for videos
            publicId: `media_${post.id}_${i}`,
            resourceType: mediaType,
            post,
            postId: post.id,
            createdAt: post.createdAt,
          });
          mediaItems.push(media);
        }
      }
    }

    // Save in batches
    const batchSize = 200;
    for (let i = 0; i < mediaItems.length; i += batchSize) {
      const batch = mediaItems.slice(i, i + batchSize);
      await mediaRepository.save(batch);
    }

    console.log(`✅ Created ${mediaItems.length} media items`);
  }

  //TODO ==================== CREATE ENGAGEMENT ====================
  async createEngagement(users: User[], posts: Post[]) {
    console.log('💫 Creating engagement...');

    await this.createLikes(users, posts);
    await this.createBookmarks(users, posts);
    await this.createReposts(users, posts);
    await this.createReplies(users, posts);
  }

  //TODO ==================== CREATE LIKES ====================
  async createLikes(users: User[], posts: Post[]) {
    console.log('❤️  Creating likes...');
    const likeRepository = this.dataSource.getRepository(Like);
    const postRepository = this.dataSource.getRepository(Post);
    const likes: Like[] = [];

    for (const post of posts) {
      const likeCount = faker.number.int({
        min: 0,
        max: this.MAX_LIKES_PER_POST,
      });
      const usersWhoLiked = faker.helpers.arrayElements(users, likeCount);

      for (const user of usersWhoLiked) {
        const like = likeRepository.create({
          post,
          user,
          postId: post.id,
          userId: user.id,
          createdAt: faker.date.between({
            from: post.createdAt,
            to: new Date(),
          }),
        });
        likes.push(like);
      }

      // Update post like count
      await postRepository.update(post.id, { likeCount });
    }

    // Save in batches
    const batchSize = 500;
    for (let i = 0; i < likes.length; i += batchSize) {
      const batch = likes.slice(i, i + batchSize);
      await likeRepository.save(batch);
    }

    console.log(`✅ Created ${likes.length} likes`);
  }

  //TODO ==================== CREATE BOOKMARKS ====================
  async createBookmarks(users: User[], posts: Post[]) {
    console.log('🔖 Creating bookmarks...');
    const bookmarkRepository = this.dataSource.getRepository(Bookmark);
    const bookmarks: Bookmark[] = [];

    for (const user of users) {
      const bookmarkCount = faker.number.int({ min: 0, max: 20 });
      const postsToBookmark = faker.helpers.arrayElements(posts, bookmarkCount);

      for (const post of postsToBookmark) {
        const bookmark = bookmarkRepository.create({
          post,
          user,
          postId: post.id,
          userId: user.id,
          createdAt: faker.date.between({
            from: post.createdAt,
            to: new Date(),
          }),
        });
        bookmarks.push(bookmark);
      }
    }

    // Save in batches
    const batchSize = 500;
    for (let i = 0; i < bookmarks.length; i += batchSize) {
      const batch = bookmarks.slice(i, i + batchSize);
      await bookmarkRepository.save(batch);
    }

    console.log(`✅ Created ${bookmarks.length} bookmarks`);
  }

  //TODO ==================== CREATE REPOSTS ====================
  async createReposts(users: User[], posts: Post[]) {
    console.log('🔄 Creating reposts...');
    const repostRepository = this.dataSource.getRepository(Repost);
    const postRepository = this.dataSource.getRepository(Post);
    const reposts: Repost[] = [];

    for (const post of posts) {
      const repostCount = faker.number.int({
        min: 0,
        max: this.MAX_REPOSTS_PER_POST,
      });
      const usersWhoReposted = faker.helpers.arrayElements(users, repostCount);

      for (const user of usersWhoReposted) {
        const repost = repostRepository.create({
          originalPost: post,
          user,
          originalPostId: post.id,
          userId: user.id,
          content: faker.datatype.boolean(0.3)
            ? faker.lorem.sentence()
            : undefined, // 30% have commentary
          createdAt: faker.date.between({
            from: post.createdAt,
            to: new Date(),
          }),
        });
        reposts.push(repost);
      }

      // Update post repost count
      await postRepository.update(post.id, { repostCount });
    }

    // Save in batches
    const batchSize = 500;
    for (let i = 0; i < reposts.length; i += batchSize) {
      const batch = reposts.slice(i, i + batchSize);
      await repostRepository.save(batch);
    }

    console.log(`✅ Created ${reposts.length} reposts`);
  }
  // ==================== CREATE NOTIFICATION PREFERENCES ====================
  async createNotificationPreferences(users: User[]) {
    console.log('🔔 Creating notification preferences...');
    const prefRepo = this.dataSource.getRepository(NotificationPreferences);
    const prefs: NotificationPreferences[] = [];

    for (const user of users) {
      const pref = prefRepo.create({
        user,
        userId: user.id,
        // In-app notifications (default true)
        likes: true,
        posts: true,
        replies: true,
        reposts: true,
        follows: true,
        mentions: true,
        system: true,
        // Email notifications (mostly false)
        emailLikes: false,
        emailReplies: false,
        emailReposts: false,
        emailFollows: false,
        emailMentions: false,
        emailSystem: true,
        emailDigest: true,
        // Push notifications
        pushLikes: true,
        pushReplies: true,
        pushReposts: true,
        pushFollows: true,
        pushMentions: true,
        pushSystem: true,
        // Additional
        soundEnabled: true,
        vibrationEnabled: true,
        deliveryTiming: 'immediate',
        mutedUsers: [],
        mutedKeywords: [],
      });
      prefs.push(pref);
    }

    // Save in batches
    const batchSize = 50;
    for (let i = 0; i < prefs.length; i += batchSize) {
      const batch = prefs.slice(i, i + batchSize);
      await prefRepo.save(batch);
    }

    console.log(`✅ Created ${prefs.length} notification preferences`);
  }

  //TODO ==================== CREATE REPLIES ====================
  async createReplies(users: User[], posts: Post[]) {
    console.log('💬 Creating replies...');
    const replyRepository = this.dataSource.getRepository(Reply);
    const postRepository = this.dataSource.getRepository(Post);
    const replies: Reply[] = [];
    const nestedReplies: Reply[] = [];

    // First pass: Create top-level replies
    for (const post of posts) {
      const replyCount = faker.number.int({
        min: 0,
        max: this.MAX_REPLIES_PER_POST,
      });
      const usersWhoReplied = faker.helpers.arrayElements(users, replyCount);

      for (const user of usersWhoReplied) {
        const replyContent = this.generateReplyContent(users, user.id);
        const reply = replyRepository.create({
          content: replyContent,
          post,
          author: user,
          postId: post.id,
          authorId: user.id,
          replyCount: 0,
          createdAt: faker.date.between({
            from: post.createdAt,
            to: new Date(),
          }),
        });
        replies.push(reply);
      }

      // Update post reply count
      await postRepository.update(post.id, { replyCount });
    }

    // Save top-level replies
    const replyBatchSize = 500;
    for (let i = 0; i < replies.length; i += replyBatchSize) {
      const batch = replies.slice(i, i + replyBatchSize);
      await replyRepository.save(batch);
    }

    console.log(`✅ Created ${replies.length} top-level replies`);

    // Second pass: Create nested replies (replies to replies)
    for (const reply of replies) {
      const nestedReplyCount = faker.number.int({ min: 0, max: 5 }); // Up to 5 nested replies per reply

      for (let i = 0; i < nestedReplyCount; i++) {
        const randomUser = faker.helpers.arrayElement(users);
        const nestedReplyContent = this.generateReplyContent(
          users,
          randomUser.id,
        );

        const nestedReply = replyRepository.create({
          content: nestedReplyContent,
          post: reply.post,
          author: randomUser,
          postId: reply.postId,
          authorId: randomUser.id,
          parentReply: reply,
          parentReplyId: reply.id,
          replyCount: 0,
          createdAt: faker.date.between({
            from: reply.createdAt,
            to: new Date(),
          }),
        });
        nestedReplies.push(nestedReply);
      }

      // Update parent reply count
      await replyRepository.update(reply.id, { replyCount: nestedReplyCount });
    }

    // Save nested replies
    for (let i = 0; i < nestedReplies.length; i += replyBatchSize) {
      const batch = nestedReplies.slice(i, i + replyBatchSize);
      await replyRepository.save(batch);
    }

    console.log(`✅ Created ${nestedReplies.length} nested replies`);
  }

  //TODO ==================== UTILITY METHODS ====================

  private generatePostContent(users: User[], authorId: string): string {
    const sentenceCount = faker.number.int({ min: 1, max: 5 });
    let content = faker.lorem.sentence(sentenceCount);

    // Add hashtags (30% chance)
    if (faker.datatype.boolean(0.3)) {
      const hashtags = faker.helpers.arrayElements(
        this.POPULAR_HASHTAGS,
        faker.number.int({ min: 1, max: 3 }),
      );
      content += ' ' + hashtags.map((tag) => `#${tag}`).join(' ');
    }

    // Add mentions (20% chance)
    if (faker.datatype.boolean(0.2)) {
      const usersToMention = faker.helpers.arrayElements(
        users.filter((u) => u.id !== authorId),
        faker.number.int({ min: 1, max: 2 }),
      );
      content += ' ' + usersToMention.map((u) => `@${u.username}`).join(' ');
    }

    return content;
  }

  private generateReplyContent(users: User[], authorId: string): string {
    const sentenceCount = faker.number.int({ min: 1, max: 3 });
    let content = faker.lorem.sentence(sentenceCount);

    // Add mentions (10% chance in replies)
    if (faker.datatype.boolean(0.1)) {
      const usersToMention = faker.helpers.arrayElements(
        users.filter((u) => u.id !== authorId),
        faker.number.int({ min: 1, max: 1 }),
      );
      content += ' ' + usersToMention.map((u) => `@${u.username}`).join(' ');
    }

    return content;
  }

  private extractHashtagsFromContent(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches
      ? matches.map((tag) => tag.replace('#', '').toLowerCase())
      : [];
  }

  private extractMentionsFromContent(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    return matches ? matches : [];
  }

  //TODO ==================== MAIN SEED METHOD ====================
  async seed() {
    try {
      console.log('🌱 Starting database seeding...');

      await this.clearDatabase();

      const users = await this.createUsers();
      await this.createNotificationPreferences(users);
      await this.createFollows(users);

      const hashtags = await this.createHashtags();
      const posts = await this.createPosts(users, hashtags);

      await this.createMedia(posts);
      await this.createEngagement(users, posts);

      console.log('🎉 Database seeding completed successfully!');
      console.log('📊 Seeding Statistics:');
      console.log(`   👥 Users: ${users.length}`);
      console.log(`   📝 Posts: ${posts.length}`);
      console.log(`   🏷️  Hashtags: ${hashtags.length}`);
      console.log(
        `   🔗 Follows: ${await this.dataSource.getRepository(Follow).count()}`,
      );
      console.log(
        `   ❤️  Likes: ${await this.dataSource.getRepository(Like).count()}`,
      );
      console.log(
        `   🔖 Bookmarks: ${await this.dataSource.getRepository(Bookmark).count()}`,
      );
      console.log(
        `   🔄 Reposts: ${await this.dataSource.getRepository(Repost).count()}`,
      );
      console.log(
        `   💬 Replies: ${await this.dataSource.getRepository(Reply).count()}`,
      );
      console.log(
        `   📍 Mentions: ${await this.dataSource.getRepository(Mention).count()}`,
      );
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }
}

//TODO ==================== RUN THE SEED ====================
async function runSeed() {
  const seeder = new DatabaseSeeder();

  try {
    await seeder.initialize();
    await seeder.seed();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await seeder.destroy();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runSeed();
}

export { DatabaseSeeder };
