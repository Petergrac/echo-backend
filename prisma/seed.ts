import * as dotenv from 'dotenv';
dotenv.config();
import {
  Echo,
  Follow,
  Hashtag,
  PrismaClient,
} from '../src/generated/prisma/client';
import { faker } from '@faker-js/faker';
// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please create a .env file with DATABASE_URL');
  process.exit(1);
}
// Add this interface to match the object returned by prisma.user.create
interface SeedUser {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  username: string;
  passwordHash: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  role: 'user' | 'admin' | string;
  avatar: string | null;
  avatarPublicId: string | null;
}

const prisma = new PrismaClient();

/**
 * TODO ====================== MAIN SEED FUNCTION ======================
 * @returns //? Populates database with 30 users, 40 posts each, and random follows
 */
async function main() {
  console.log('🚀 Starting database seed...');

  // Clear existing data (optional - be careful in production!)
  await clearDatabase();

  // Create users
  const users = await createUsers(30);
  console.log(`✅ Created ${users.length} users`);

  // Create echoes (posts) for each user
  const echoes = await createEchoes(users, 40);
  console.log(`✅ Created ${echoes.length} echoes`);

  // Create random follows between users
  const follows = await createFollows(users);
  console.log(`✅ Created ${follows.length} follow relationships`);

  // Create random engagements (likes, ripples, reechoes, bookmarks)
  await createEngagements(users, echoes);
  console.log(`✅ Created random engagements`);

  // Create hashtags and link to echoes
  await createHashtagsAndLinks(echoes);
  console.log(`✅ Created hashtags and links`);

  console.log('🎉 Database seeded successfully!');
}

/**
 * TODO ====================== CLEAR DATABASE ======================
 * @returns //? Clears all existing data in correct order to avoid FK constraints
 */
async function clearDatabase() {
  console.log('🧹 Clearing existing data...');

  // Delete in correct order to respect foreign key constraints
  await prisma.notification.deleteMany();
  await prisma.echoHashtag.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.like.deleteMany();
  await prisma.ripple.deleteMany();
  await prisma.reEcho.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.media.deleteMany();
  await prisma.echo.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.emailToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared');
}

/**
 * TODO ====================== CREATE USERS ======================
 * @param count
 * @returns //? Creates specified number of users with realistic data
 */
async function createUsers(count: number) {
  const users: SeedUser[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = faker.internet
      .username({ firstName, lastName })
      .toLowerCase()
      .slice(0, 15);

    const user = await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName, lastName }),
        username: username + i, // Ensure uniqueness
        firstName,
        lastName,
        passwordHash: '$2b$10$examplehashedpassword', // Mock hash
        bio: faker.person.bio(),
        location: faker.location.city() + ', ' + faker.location.state(),
        website: faker.internet.url(),
        role: i === 0 ? 'admin' : 'user', // First user is admin
        // avatar and avatarPublicId left null as requested
      },
    });
    // Then use it for the users array
    users.push(user);
  }

  return users;
}

/**
 * TODO ====================== CREATE ECHOES ======================
 * @param users
 * @param echoesPerUser
 * @returns //? Creates specified number of echoes per user with realistic content
 */
async function createEchoes(users: any[], echoesPerUser: number) {
  const allEchoes: Echo[] = [];
  const hashtags = [
    'programming',
    'javascript',
    'typescript',
    'nodejs',
    'react',
    'vue',
    'angular',
    'python',
    'java',
    'golang',
    'rust',
    'docker',
    'kubernetes',
    'aws',
    'cloud',
    'webdev',
    'frontend',
    'backend',
    'fullstack',
    'devops',
    'ai',
    'ml',
    'datascience',
    'startup',
    'tech',
    'coding',
    'software',
    'opensource',
    'github',
    'linux',
  ];

  for (const user of users) {
    const userEchoes: Echo[] = [];

    for (let i = 0; i < echoesPerUser; i++) {
      // Generate realistic tech-related content with hashtags
      const content = generateEchoContent(hashtags);

      const echo = await prisma.echo.create({
        data: {
          content,
          authorId: user.id,
          sensitive: faker.datatype.boolean(0.1), // 10% chance of being sensitive
          createdAt: faker.date.between({
            from: new Date('2024-01-01'),
            to: new Date(),
          }),
        },
      });

      userEchoes.push(echo);

      // Occasionally create media for echoes (30% of echoes)
      if (faker.datatype.boolean(0.3)) {
        await createMediaForEcho(echo.id);
      }
    }

    allEchoes.push(...userEchoes);
  }

  return allEchoes;
}

/**
 * TODO ====================== GENERATE ECHO CONTENT ======================
 * @param hashtags
 * @returns //? Generates realistic tech-related content with random hashtags
 */
function generateEchoContent(hashtags: string[]): string {
  const techTopics = [
    'Just deployed my new project using',
    'Struggling with',
    'Excited to announce our launch of',
    'Deep dive into',
    'Why I switched from',
    'The future of',
    'Building scalable applications with',
    'My thoughts on',
    'Tutorial: Getting started with',
    'The power of',
    'Challenges with',
    'Success story: Migrating to',
    'Best practices for',
    'Comparing',
    'How to optimize',
  ];

  const techWords = [
    'microservices',
    'serverless',
    'containers',
    'APIs',
    'databases',
    'cloud infrastructure',
    'machine learning models',
    'web applications',
    'mobile apps',
    'desktop software',
    'devops pipelines',
    'CI/CD workflows',
    'monitoring tools',
    'logging systems',
  ];

  const topic = faker.helpers.arrayElement(techTopics);
  const tech = faker.helpers.arrayElement(techWords);
  const sentence = faker.lorem.sentence();

  // Add 0-3 random hashtags
  const randomHashtags = faker.helpers.arrayElements(
    hashtags,
    faker.number.int({ min: 0, max: 3 }),
  );
  const hashtagString =
    randomHashtags.length > 0
      ? ' ' + randomHashtags.map((tag) => `#${tag}`).join(' ')
      : '';

  return `${topic} ${tech}. ${sentence}${hashtagString}`;
}

/**
 * TODO ====================== CREATE MEDIA FOR ECHO ======================
 * @param echoId
 * @returns //? Creates mock media records for echoes
 */
async function createMediaForEcho(echoId: string) {
  const mediaTypes = [
    { mimetype: 'image/jpeg', resourceType: 'image' },
    { mimetype: 'image/png', resourceType: 'image' },
    { mimetype: 'video/mp4', resourceType: 'video' },
  ];

  const mediaType = faker.helpers.arrayElement(mediaTypes);

  await prisma.media.create({
    data: {
      echoId,
      url: faker.image.url(),
      publicId: faker.string.uuid(),
      mimetype: mediaType.mimetype,
      resourceType: mediaType.resourceType,
      createdAt: faker.date.recent(),
    },
  });
}

/**
 * TODO ====================== CREATE FOLLOWS ======================
 * @param users
 * @returns //? Creates random follow relationships between users
 */
async function createFollows(users: any[]) {
  const follows: Follow[] = [];

  for (const user of users) {
    // Each user follows 5-15 other random users
    const followCount = faker.number.int({ min: 5, max: 15 });
    const usersToFollow = faker.helpers.arrayElements(
      users.filter((u) => u.id !== user.id), // Don't follow self
      Math.min(followCount, users.length - 1),
    );

    for (const userToFollow of usersToFollow) {
      try {
        const follow = await prisma.follow.create({
          data: {
            followerId: user.id,
            followingId: userToFollow.id,
            createdAt: faker.date.recent(),
          },
        });
        follows.push(follow);
      } catch (error) {
        // Ignore duplicate follow attempts
      }
    }
  }

  return follows;
}

/**
 * TODO ====================== CREATE ENGAGEMENTS ======================
 * @param users
 * @param echoes
 * @returns //? Creates random likes, ripples, reechoes, and bookmarks
 */
async function createEngagements(users: any[], echoes: any[]) {
  for (const echo of echoes) {
    // Random engagements for each echo
    const engagementCount = faker.number.int({ min: 5, max: 25 });
    const engagingUsers = faker.helpers.arrayElements(users, engagementCount);

    for (const user of engagingUsers) {
      // Randomly decide engagement type
      const engagementType = faker.helpers.arrayElement([
        'like',
        'ripple',
        'reecho',
        'bookmark',
      ]);

      try {
        switch (engagementType) {
          case 'like':
            await prisma.like.create({
              data: {
                userId: user.id,
                echoId: echo.id,
                createdAt: faker.date.between({
                  from: echo.createdAt,
                  to: new Date(),
                }),
              },
            });
            break;

          case 'ripple':
            // Sometimes create replies to existing ripples
            const existingRipples = await prisma.ripple.findMany({
              where: { echoId: echo.id },
            });

            const parentId =
              existingRipples.length > 0 && faker.datatype.boolean(0.3)
                ? faker.helpers.arrayElement(existingRipples).id
                : null;

            await prisma.ripple.create({
              data: {
                content: faker.lorem.sentences(
                  faker.number.int({ min: 1, max: 3 }),
                ),
                userId: user.id,
                echoId: echo.id,
                parentId,
                createdAt: faker.date.between({
                  from: echo.createdAt,
                  to: new Date(),
                }),
              },
            });
            break;

          case 'reecho':
            await prisma.reEcho.create({
              data: {
                userId: user.id,
                echoId: echo.id,
                createdAt: faker.date.between({
                  from: echo.createdAt,
                  to: new Date(),
                }),
              },
            });
            break;

          case 'bookmark':
            await prisma.bookmark.create({
              data: {
                userId: user.id,
                echoId: echo.id,
                createdAt: faker.date.between({
                  from: echo.createdAt,
                  to: new Date(),
                }),
              },
            });
            break;
        }
      } catch (error) {
        // Ignore duplicate engagement attempts
      }
    }
  }
}

/**
 * TODO ====================== CREATE HASHTAGS AND LINKS ======================
 * @param echoes
 * @returns //? Creates hashtag records and links them to echoes
 */
async function createHashtagsAndLinks(echoes: any[]) {
  const popularHashtags = [
    'programming',
    'javascript',
    'typescript',
    'webdev',
    'react',
    'nodejs',
    'python',
    'java',
    'aws',
    'docker',
    'kubernetes',
    'opensource',
  ];

  // Create hashtag records
  const hashtagRecords: Hashtag[] = [];
  for (const tagName of popularHashtags) {
    const hashtag = await prisma.hashtag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
    hashtagRecords.push(hashtag);
  }

  // Link hashtags to echoes that mention them
  for (const echo of echoes) {
    if (echo.content) {
      const hashtagMatches = echo.content.match(/#(\w+)/g) || [];
      const uniqueHashtags = [
        ...new Set(hashtagMatches.map((tag: string) => tag.slice(1))),
      ];

      for (const tagName of uniqueHashtags) {
        const hashtag = hashtagRecords.find((h) => h.name === tagName);
        if (hashtag) {
          try {
            await prisma.echoHashtag.create({
              data: {
                echoId: echo.id,
                hashtagId: hashtag.id,
              },
            });
          } catch (error) {
            // Ignore duplicate links
          }
        }
      }
    }
  }
}

/**
 * TODO ====================== RUN SEED AND HANDLE ERRORS ======================
 */
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
