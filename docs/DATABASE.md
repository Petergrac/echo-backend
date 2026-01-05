# DATABASE.md - Schema & Entity Relationships

## 🗄️ Database Overview

Echo Backend uses **PostgreSQL** with **TypeORM** for object-relational mapping. The database follows a normalized schema with proper relationships and constraints.

---

## 📊 Entity Relationship Diagram

```
┌─────────────────────┐
│       USERS         │
├─────────────────────┤
│ PK: id (UUID)       │
│ email*              │
│ username*           │
│ password (hashed)   │
│ fullName            │
│ bio                 │
│ avatar              │
│ role                │
│ emailVerified       │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘
        ↑ ↓
        │ │
    ┌───┴─┴───┐
    │          │
    │          ▼
    │   ┌──────────────────────┐
    │   │   FOLLOWS            │
    │   ├──────────────────────┤
    │   │ PK: id               │
    │   │ FK: followerId       │──→ User
    │   │ FK: followingId      │──→ User
    │   │ createdAt            │
    │   └──────────────────────┘
    │
    ▼
┌─────────────────────┐
│      POSTS          │
├─────────────────────┤
│ PK: id (UUID)       │
│ FK: authorId        │──→ User
│ title               │
│ content             │
│ likeCount           │
│ replyCount          │
│ repostCount         │
│ isDeleted           │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘
   ↑ ↓ ↓ ↓
   │ │ │ │
   │ │ │ └─────────────────┐
   │ │ └─────────────┐     │
   │ └─────────┐    │     │
   │           ▼    ▼     ▼
   │    ┌──────────────┐
   │    │   REPLIES    │
   │    ├──────────────┤
   │    │ PK: id       │
   │    │ FK: postId   │──→ Post
   │    │ FK: authorId │──→ User
   │    │ content      │
   │    │ parentId     │──→ Reply
   │    │ isDeleted    │
   │    └──────────────┘
   │
   ├──────────────────┐
   │                  │
   ▼                  ▼
┌──────────────┐   ┌──────────────────┐
│   LIKES      │   │    BOOKMARKS     │
├──────────────┤   ├──────────────────┤
│ PK: id       │   │ PK: id           │
│ FK: userId   │   │ FK: userId       │
│ FK: postId   │   │ FK: postId       │
│ createdAt    │   │ createdAt        │
└──────────────┘   └──────────────────┘

┌──────────────┐
│   REPOSTS    │
├──────────────┤
│ PK: id       │
│ FK: userId   │
│ FK: postId   │
│ createdAt    │
└──────────────┘

┌──────────────────────┐
│      MENTIONS        │
├──────────────────────┤
│ PK: id               │
│ FK: postId           │
│ FK: userId           │
│ isRead               │
│ createdAt            │
└──────────────────────┘

┌──────────────────────┐
│      HASHTAGS        │
├──────────────────────┤
│ PK: id               │
│ tag*                 │
│ usageCount           │
│ lastUsedAt           │
└──────────────────────┘

┌──────────────────────┐
│    POST_HASHTAGS     │
├──────────────────────┤
│ PK: id               │
│ FK: postId           │
│ FK: hashtagId        │
└──────────────────────┘

┌──────────────────────┐
│       MEDIA          │
├──────────────────────┤
│ PK: id               │
│ FK: postId           │
│ FK: replyId          │
│ url                  │
│ mediaType            │
│ cloudinaryId         │
└──────────────────────┘
```

---

## 📋 Core Entities

### 1. User

**Table**: `users`

| Column             | Type         | Constraints      | Description                |
| ------------------ | ------------ | ---------------- | -------------------------- |
| id                 | UUID         | PK               | Unique identifier          |
| email              | VARCHAR(255) | UNIQUE, NOT NULL | Email address              |
| username           | VARCHAR(50)  | UNIQUE, NOT NULL | Username handle            |
| password           | VARCHAR(255) | NOT NULL         | Bcrypt hashed              |
| fullName           | VARCHAR(100) |                  | Display name               |
| bio                | TEXT         |                  | User biography             |
| avatar             | VARCHAR(500) |                  | Profile picture URL        |
| role               | ENUM         | DEFAULT 'user'   | user \| admin \| moderator |
| emailVerified      | BOOLEAN      | DEFAULT false    | Email confirmation status  |
| isActive           | BOOLEAN      | DEFAULT true     | Account status             |
| accountLockedUntil | TIMESTAMP    |                  | Failed login lockout       |
| createdAt          | TIMESTAMP    | DEFAULT NOW()    | Account creation           |
| updatedAt          | TIMESTAMP    | ON UPDATE NOW()  | Last modified              |

**Indexes**:

```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_createdAt ON users(createdAt);
```

---

### 2. RefreshToken

**Table**: `refresh_tokens`

| Column    | Type        | Constraints   | Description          |
| --------- | ----------- | ------------- | -------------------- |
| id        | UUID        | PK            | Unique identifier    |
| userId    | UUID        | FK → users.id | Token owner          |
| token     | TEXT        | UNIQUE        | Hashed token         |
| expiresAt | TIMESTAMP   |               | Token expiry         |
| revokedAt | TIMESTAMP   | NULL          | Revocation timestamp |
| ipAddress | VARCHAR(45) |               | IP where issued      |
| userAgent | TEXT        |               | Browser/client info  |
| createdAt | TIMESTAMP   | DEFAULT NOW() | Creation time        |

**Indexes**:

```sql
CREATE INDEX idx_refresh_tokens_userId ON refresh_tokens(userId);
CREATE INDEX idx_refresh_tokens_expiresAt ON refresh_tokens(expiresAt);
```

---

### 3. EmailToken

**Table**: `email_tokens`

| Column    | Type      | Constraints   | Description              |
| --------- | --------- | ------------- | ------------------------ |
| id        | UUID      | PK            | Unique identifier        |
| userId    | UUID      | FK → users.id | Token owner              |
| token     | TEXT      | UNIQUE        | Verification token       |
| type      | ENUM      |               | VERIFY \| PASSWORD_RESET |
| expiresAt | TIMESTAMP |               | Token expiry             |
| usedAt    | TIMESTAMP | NULL          | When used                |
| createdAt | TIMESTAMP |               | Creation time            |

---

### 4. Post

**Table**: `posts`

| Column      | Type         | Constraints   | Description        |
| ----------- | ------------ | ------------- | ------------------ |
| id          | UUID         | PK            | Unique identifier  |
| authorId    | UUID         | FK → users.id | Post creator       |
| title       | VARCHAR(280) |               | Post title         |
| content     | TEXT         |               | Post content       |
| likeCount   | INT          | DEFAULT 0     | Like counter       |
| replyCount  | INT          | DEFAULT 0     | Reply counter      |
| repostCount | INT          | DEFAULT 0     | Repost counter     |
| isDeleted   | BOOLEAN      | DEFAULT false | Soft delete flag   |
| deletedAt   | TIMESTAMP    | NULL          | Deletion timestamp |
| createdAt   | TIMESTAMP    | DEFAULT NOW() | Creation time      |
| updatedAt   | TIMESTAMP    |               | Last modified      |

**Indexes**:

```sql
CREATE INDEX idx_posts_authorId ON posts(authorId);
CREATE INDEX idx_posts_createdAt ON posts(createdAt DESC);
CREATE INDEX idx_posts_isDeleted ON posts(isDeleted);
```

---

### 5. Reply

**Table**: `replies`

| Column        | Type      | Constraints     | Description           |
| ------------- | --------- | --------------- | --------------------- |
| id            | UUID      | PK              | Unique identifier     |
| postId        | UUID      | FK → posts.id   | Parent post           |
| authorId      | UUID      | FK → users.id   | Reply creator         |
| content       | TEXT      |                 | Reply content         |
| parentReplyId | UUID      | FK → replies.id | Parent reply (nested) |
| isDeleted     | BOOLEAN   | DEFAULT false   | Soft delete flag      |
| deletedAt     | TIMESTAMP | NULL            | Deletion timestamp    |
| createdAt     | TIMESTAMP |                 | Creation time         |
| updatedAt     | TIMESTAMP |                 | Last modified         |

**Indexes**:

```sql
CREATE INDEX idx_replies_postId ON replies(postId);
CREATE INDEX idx_replies_authorId ON replies(authorId);
CREATE INDEX idx_replies_parentReplyId ON replies(parentReplyId);
```

---

### 6. Like

**Table**: `likes`

| Column    | Type      | Constraints   | Description       |
| --------- | --------- | ------------- | ----------------- |
| id        | UUID      | PK            | Unique identifier |
| userId    | UUID      | FK → users.id | Who liked         |
| postId    | UUID      | FK → posts.id | What was liked    |
| createdAt | TIMESTAMP |               | Creation time     |

**Constraints**:

```sql
ALTER TABLE likes ADD CONSTRAINT unique_user_post
  UNIQUE(userId, postId);
```

**Indexes**:

```sql
CREATE INDEX idx_likes_userId ON likes(userId);
CREATE INDEX idx_likes_postId ON likes(postId);
```

---

### 7. Bookmark

**Table**: `bookmarks`

| Column    | Type      | Constraints   | Description         |
| --------- | --------- | ------------- | ------------------- |
| id        | UUID      | PK            | Unique identifier   |
| userId    | UUID      | FK → users.id | Who bookmarked      |
| postId    | UUID      | FK → posts.id | What was bookmarked |
| createdAt | TIMESTAMP |               | Creation time       |

**Constraints**:

```sql
ALTER TABLE bookmarks ADD CONSTRAINT unique_user_post_bookmark
  UNIQUE(userId, postId);
```

---

### 8. Follow

**Table**: `follows`

| Column      | Type      | Constraints   | Description       |
| ----------- | --------- | ------------- | ----------------- |
| id          | UUID      | PK            | Unique identifier |
| followerId  | UUID      | FK → users.id | Who follows       |
| followingId | UUID      | FK → users.id | Who is followed   |
| createdAt   | TIMESTAMP |               | Creation time     |

**Constraints**:

```sql
ALTER TABLE follows ADD CONSTRAINT no_self_follow
  CHECK (followerId != followingId);
ALTER TABLE follows ADD CONSTRAINT unique_follow
  UNIQUE(followerId, followingId);
```

---

### 9. Conversation

**Table**: `conversations`

| Column        | Type         | Constraints   | Description              |
| ------------- | ------------ | ------------- | ------------------------ |
| id            | UUID         | PK            | Unique identifier        |
| creatorId     | UUID         | FK → users.id | Conversation creator     |
| name          | VARCHAR(255) |               | Group name (null for DM) |
| isGroupChat   | BOOLEAN      | DEFAULT false | Group vs 1-on-1          |
| lastMessageAt | TIMESTAMP    | NULL          | Last activity            |
| createdAt     | TIMESTAMP    |               | Creation time            |
| updatedAt     | TIMESTAMP    |               | Last modified            |

---

### 10. Message

**Table**: `messages`

| Column         | Type      | Constraints           | Description       |
| -------------- | --------- | --------------------- | ----------------- |
| id             | UUID      | PK                    | Unique identifier |
| conversationId | UUID      | FK → conversations.id | Chat room         |
| senderId       | UUID      | FK → users.id         | Message sender    |
| content        | TEXT      |                       | Message content   |
| isEdited       | BOOLEAN   | DEFAULT false         | Edit flag         |
| editedAt       | TIMESTAMP | NULL                  | Last edit time    |
| isDeleted      | BOOLEAN   | DEFAULT false         | Deletion flag     |
| deletedAt      | TIMESTAMP | NULL                  | Deletion time     |
| createdAt      | TIMESTAMP |                       | Creation time     |

**Indexes**:

```sql
CREATE INDEX idx_messages_conversationId ON messages(conversationId);
CREATE INDEX idx_messages_senderId ON messages(senderId);
CREATE INDEX idx_messages_createdAt ON messages(createdAt DESC);
```

---

### 11. Notification

**Table**: `notifications`

| Column      | Type        | Constraints   | Description                        |
| ----------- | ----------- | ------------- | ---------------------------------- |
| id          | UUID        | PK            | Unique identifier                  |
| userId      | UUID        | FK → users.id | Notification recipient             |
| type        | VARCHAR(50) |               | like \| reply \| follow \| mention |
| triggeredBy | UUID        | FK → users.id | Action source                      |
| targetId    | UUID        |               | Related entity ID                  |
| message     | TEXT        |               | Notification message               |
| isRead      | BOOLEAN     | DEFAULT false | Read status                        |
| readAt      | TIMESTAMP   | NULL          | Read timestamp                     |
| createdAt   | TIMESTAMP   |               | Creation time                      |

**Indexes**:

```sql
CREATE INDEX idx_notifications_userId ON notifications(userId);
CREATE INDEX idx_notifications_isRead ON notifications(isRead);
CREATE INDEX idx_notifications_createdAt ON notifications(createdAt DESC);
```

---

### 12. AuditLog

**Table**: `audit_logs`

| Column     | Type         | Constraints   | Description                |
| ---------- | ------------ | ------------- | -------------------------- |
| id         | UUID         | PK            | Unique identifier          |
| userId     | UUID         | FK → users.id | Action performer           |
| action     | VARCHAR(100) |               | ACTION_NAME                |
| resource   | VARCHAR(50)  |               | posts \| users \| messages |
| resourceId | UUID         |               | Entity being modified      |
| changes    | JSONB        |               | Before/after diff          |
| ipAddress  | VARCHAR(45)  |               | Request IP                 |
| userAgent  | TEXT         |               | Browser info               |
| createdAt  | TIMESTAMP    |               | Creation time              |

---

## 🔑 Key Relationships

### One-to-Many

- User → Posts (author writes posts)
- User → Followers (user has followers)
- Conversation → Messages
- Post → Replies
- Post → Likes
- Post → Bookmarks

### Many-to-Many

- Users → Users (followers/following via Follow table)
- Posts → Hashtags (via PostHashtag junction table)

### Self-Referencing

- Reply → Reply (nested comments)
- Follow.followerId → User
- Follow.followingId → User

---

## 🔄 Cascade Rules

```typescript
@ManyToOne()
@JoinColumn()
posts: Post;

// When user is deleted:
@OneToMany(() => Post, (post) => post.author, {
  onDelete: 'CASCADE'  // Delete all their posts
})
```

---

## 📈 Common Queries

### Get User Feed (Optimized)

```sql
SELECT p.* FROM posts p
INNER JOIN follows f ON p.authorId = f.followingId
WHERE f.followerId = $1 AND p.isDeleted = false
ORDER BY p.createdAt DESC
LIMIT $2 OFFSET $3;
```

### Get Trending Hashtags

```sql
SELECT h.tag, COUNT(ph.id) as usageCount
FROM hashtags h
LEFT JOIN post_hashtags ph ON h.id = ph.hashtagId
WHERE ph.createdAt > NOW() - INTERVAL '7 days'
GROUP BY h.id
ORDER BY usageCount DESC
LIMIT 10;
```

### Get User Interactions

```sql
SELECT
  (SELECT COUNT(*) FROM likes WHERE userId = $1) as totalLikes,
  (SELECT COUNT(*) FROM bookmarks WHERE userId = $1) as totalBookmarks,
  (SELECT COUNT(*) FROM follows WHERE followerId = $1) as following,
  (SELECT COUNT(*) FROM follows WHERE followingId = $1) as followers;
```

---

## 🚀 Migration Strategy

### Create New Migration

```bash
pnpm run m:gen -- -n "AddNewFeature"
```

### Generated Migration Template

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddNewFeature1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'new_table',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          // ... columns
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('new_table');
  }
}
```

---

## 📊 Database Performance Tips

### 1. Add Indexes for Frequent Queries

```typescript
@Index()
@Column()
userId: string;

@Index({ unique: true })
@Column()
email: string;
```

### 2. Use Pagination

```typescript
skip: (page - 1) * limit,
take: limit
```

### 3. Select Only Needed Columns

```typescript
this.repo.find({
  select: ['id', 'username', 'email'],
  relations: ['posts'],
});
```

### 4. Use Query Builder for Complex Queries

```typescript
this.repo
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post')
  .where('user.id = :id', { id })
  .orderBy('post.createdAt', 'DESC')
  .getMany();
```

---

## 🔐 Data Integrity

### Constraints Applied

- **UNIQUE**: email, username
- **NOT NULL**: email, username, password
- **CHECK**: No self-follows
- **FOREIGN KEY**: All relationships with CASCADE delete
- **DEFAULT**: Boolean flags, timestamps

---

## 📚 Related Documentation

- See `SETUP.md` for database initialization
- See `ARCHITECTURE.md` for entity mapping code
- See `AUTHENTICATION.md` for user/token tables

---

**Last Updated**: December 2, 2025
