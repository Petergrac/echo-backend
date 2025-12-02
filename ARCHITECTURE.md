# ARCHITECTURE.md - Project Structure & Design Patterns

## 📐 Architecture Overview

Echo Backend is built with **NestJS**, following a modular, scalable architecture with clear separation of concerns. The application uses **Domain-Driven Design (DDD)** principles with feature-based module organization.

```
src/
├── modules/           # Feature modules
├── common/            # Shared resources
├── instruments.ts     # Monitoring setup (Sentry)
└── main.ts           # Application entry point
```

---

## 🏗️ Project Structure

### Directory Hierarchy

```
src/
├── modules/
│   ├── auth/                 # Authentication & Authorization
│   │   ├── entities/         # User, RefreshToken, AuditLog, EmailToken
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── guards/           # JWT Auth Guard
│   │   ├── strategies/       # Passport strategies
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── token.service.ts
│   │   └── auth.module.ts
│   │
│   ├── users/                # User Management
│   │   ├── entities/         # User relations
│   │   ├── follow/           # Follow submodule
│   │   │   ├── follow.entity.ts
│   │   │   ├── follow.service.ts
│   │   │   ├── follow.controller.ts
│   │   │   └── follow.module.ts
│   │   ├── dto/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   │
│   ├── posts/                # Posts & Engagement
│   │   ├── entities/         # Post, Reply, Like, Bookmark, Mention, Hashtag, etc.
│   │   ├── controllers/
│   │   │   ├── posts.controller.ts          # CRUD posts
│   │   │   ├── engagement.controller.ts     # Likes, replies, reposts
│   │   │   ├── mention.controller.ts        # Mentions
│   │   │   └── hashtag.controller.ts        # Hashtags
│   │   ├── services/
│   │   │   ├── posts.service.ts
│   │   │   ├── engagement.service.ts
│   │   │   ├── feed.service.ts
│   │   │   ├── mention.service.ts
│   │   │   ├── hashtag.service.ts
│   │   │   └── media.service.ts
│   │   ├── pipes/            # File validation
│   │   ├── dto/
│   │   └── posts.module.ts
│   │
│   ├── chat/                 # Chat & Messaging
│   │   ├── entities/         # Conversation, Message, Reactions, Receipts
│   │   ├── controllers/
│   │   │   └── chat.controller.ts
│   │   ├── services/
│   │   │   ├── chat.service.ts
│   │   │   └── message.service.ts
│   │   ├── gateway/
│   │   │   └── chat.gateway.ts       # WebSocket events
│   │   ├── dto/
│   │   ├── pipes/
│   │   └── chat.module.ts
│   │
│   ├── search/               # Search & Discovery
│   │   ├── search.controller.ts
│   │   ├── search.service.ts
│   │   └── search.module.ts
│   │
│   ├── notifications/        # Notifications & Preferences
│   │   ├── entities/         # Notification, NotificationPreference
│   │   ├── controllers/
│   │   │   ├── notification.controller.ts
│   │   │   └── notification-preference.controller.ts
│   │   ├── services/
│   │   │   ├── notifications.service.ts
│   │   │   └── notification-preference.service.ts
│   │   ├── gateway/          # WebSocket for real-time notifications
│   │   │   └── notifications.gateway.ts
│   │   ├── dto/
│   │   └── notifications.module.ts
│   │
│   └── admin/                # Admin Dashboard
│       ├── controllers/
│       │   └── admin.controller.ts
│       ├── services/
│       │   └── admin.service.ts
│       ├── guards/
│       │   └── admin.guard.ts
│       ├── types/
│       └── admin.module.ts
│
├── common/                   # Shared across modules
│   ├── cloudinary/          # File upload service
│   │   ├── cloudinary.service.ts
│   │   ├── cloudinary.provider.ts
│   │   └── cloudinary.module.ts
│   ├── controllers/
│   │   └── healthcare.controller.ts   # Health checks
│   ├── decorators/
│   │   └── roles.decorator.ts         # @Roles() custom decorator
│   ├── entities/
│   │   └── common.entity.ts           # Base entity class
│   ├── enums/
│   │   └── audit.enums.ts
│   ├── filters/
│   │   └── custom-all-filter.filter.ts    # Global exception filter
│   ├── guards/
│   │   ├── arcjet.guard.ts            # Rate limiting
│   │   └── roles.guard.ts             # RBAC guard
│   ├── mailer/
│   │   ├── mail.service.ts            # Email service
│   │   ├── mailer.module.ts
│   │   └── templates/                 # Email templates
│   ├── module/
│   │   └── common.module.ts           # Common module definition
│   ├── pipes/
│   │   └── file-validation.pipe.ts    # File upload validation
│   ├── services/
│   │   ├── audit.service.ts           # Audit logging
│   │   └── healthcare.service.ts
│   └── tasks/
│       └── cleanup.task.ts            # Scheduled cleanup tasks
│
├── app.module.ts             # Root module
├── main.ts                   # Bootstrap
└── instruments.ts            # Sentry monitoring setup

database/
├── dataSource.ts             # TypeORM data source config
├── migrations/               # Database migrations
│   └── *-migrations.ts
└── seed-database.ts         # Database seeding

test/
├── app.e2e-spec.ts          # E2E tests
└── jest-e2e.json            # E2E test config
```

---

## 🎯 Core Design Patterns

### 1. Module Pattern

Each feature is organized as a self-contained module with:

- **Entity**: Database model
- **DTO**: Input/output validation
- **Service**: Business logic
- **Controller**: Route handlers
- **Module**: Dependency injection setup

Example:

```typescript
// Module
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

// Service
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}
}

// Controller
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

### 2. Dependency Injection (DI)

NestJS provides constructor-based DI:

```typescript
// Constructor injection
constructor(
  private readonly usersService: UsersService,
  private readonly mailService: MailService,
) {}

// Module-level exports for inter-module access
@Module({
  exports: [UsersService],
})
```

### 3. Guards & Interceptors

**Guards** control who can access routes:

```typescript
@Controller('posts')
@UseGuards(JwtAuthGuard)  // Only authenticated users
export class PostsController {}

@Post('users/:id/ban')
@UseGuards(JwtAuthGuard, AdminGuard)  // Only admins
async banUser() {}
```

**Interceptors** transform requests/responses:

```typescript
@UseInterceptors(FilesInterceptor('media', 5))  // Upload up to 5 files
async createPost(@UploadedFiles() files: Express.Multer.File[]) {}
```

### 4. Pipes & Validation

Pipes validate and transform data:

```typescript
@Post()
async create(@Body() createDto: CreateUserDto) {
  // Automatically validated against CreateUserDto schema
}

@Get(':id')
async getById(@Param('id', new ParseUUIDPipe()) id: string) {
  // Validates UUID format
}
```

### 5. Entity Relationships

Using TypeORM decorators:

```typescript
@Entity()
export class User extends CoreEntity {
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @ManyToMany(() => User, (user) => user.following)
  followers: User[];

  @ManyToOne(() => User)
  following: User[];
}
```

---

## 🔐 Authentication Flow

```
1. User sends credentials → POST /auth/login
2. AuthService validates credentials
3. TokenService creates JWT + Refresh Token
4. Refresh token stored in HttpOnly cookie
5. Access token returned in response

Protected Route Flow:
1. Client sends request with Bearer token
2. JwtAuthGuard validates token
3. Request.user populated with decoded token
4. Controller processes request
```

---

## 🗄️ Database Layer

**TypeORM** handles database operations:

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(data: CreateUserDto): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }
}
```

---

## 📊 Module Dependencies

```
AppModule (Root)
├── AuthModule
├── UsersModule
│   └── FollowModule
├── PostsModule
├── ChatModule
├── SearchModule
├── NotificationsModule
├── AdminModule
├── CommonModule
│   ├── CloudinaryModule
│   └── MailerModule
```

---

## ⚙️ Global Setup

### AppModule Configuration

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(), // Environment variables
    TypeOrmModule.forRoot(), // Database connection
    CacheModule.registerAsync(), // Redis caching
    ThrottlerModule.forRoot(), // Rate limiting
    ArcjetModule.forRoot(), // Security guards
    ScheduleModule.forRoot(), // Scheduled tasks
    AuthModule,
    UsersModule,
    PostsModule,
    ChatModule,
    // ... other modules
  ],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: CustomArcjetGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

---

## 🔄 Data Flow Example: Creating a Post

```
POST /posts
  ↓
[JwtAuthGuard] - Verify token
  ↓
PostsController.createPost()
  ↓
[FileValidationPipe] - Validate media files
  ↓
PostsService.createPost()
  ↓
[Database] - Insert post record
  ↓
[Cloudinary] - Upload media files
  ↓
[Audit Log] - Record action
  ↓
Response: Post object with media URLs
```

---

## 🎨 Best Practices

### 1. Service Abstraction

Keep business logic in services, not controllers:

```typescript
// ❌ Bad: Logic in controller
@Controller('posts')
export class PostsController {
  @Post()
  async create(@Body() dto: CreatePostDto) {
    const post = new Post();
    post.title = dto.title;
    // ... more logic
    return save(post);
  }
}

// ✅ Good: Logic in service
@Controller('posts')
export class PostsController {
  @Post()
  async create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }
}
```

### 2. Error Handling

Use custom exceptions:

```typescript
throw new NotFoundException('Post not found');
throw new BadRequestException('Invalid email');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Access denied');
```

### 3. Pagination

Use consistent pagination:

```typescript
async getAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
) {
  const skip = (page - 1) * limit;
  return this.repo.find({ skip, take: limit });
}
```

### 4. Type Safety

Leverage TypeScript fully:

```typescript
interface PaginationParams {
  page: number;
  limit: number;
}

interface ApiResponse<T> {
  data: T;
  total: number;
  page: number;
}
```

---

## 🚀 Scalability Considerations

1. **Microservices Ready**: Each module can be extracted to separate service
2. **Caching Layer**: Redis caching for frequently accessed data
3. **Message Queue**: Event emitters for async operations
4. **Database Indexing**: Optimized indexes on frequently queried fields
5. **API Versioning**: Ready for `/v2` endpoints

---

## 📚 Related Documentation

- See `AUTHENTICATION.md` for security details
- See `DATABASE.md` for entity relationships
- See `ENDPOINTS.md` for API routes

---

**Last Updated**: December 2, 2025
