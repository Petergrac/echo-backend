-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'RIPPLE';
ALTER TYPE "NotificationType" ADD VALUE 'RIPPLE_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'REECHO';

-- AlterTable
ALTER TABLE "Echo" ADD COLUMN     "sensitive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "echoId" TEXT,
ADD COLUMN     "rippleId" TEXT;

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "echoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ripple" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "echoId" TEXT NOT NULL,
    "parentId" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ripple_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReEcho" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "echoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReEcho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "echoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hashtag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchoHashtag" (
    "id" TEXT NOT NULL,
    "echoId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,

    CONSTRAINT "EchoHashtag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Like_echoId_createdAt_idx" ON "Like"("echoId", "createdAt");

-- CreateIndex
CREATE INDEX "Like_userId_createdAt_idx" ON "Like"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_echoId_key" ON "Like"("userId", "echoId");

-- CreateIndex
CREATE INDEX "Ripple_echoId_createdAt_idx" ON "Ripple"("echoId", "createdAt");

-- CreateIndex
CREATE INDEX "Ripple_userId_createdAt_idx" ON "Ripple"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ripple_parentId_idx" ON "Ripple"("parentId");

-- CreateIndex
CREATE INDEX "ReEcho_echoId_createdAt_idx" ON "ReEcho"("echoId", "createdAt");

-- CreateIndex
CREATE INDEX "ReEcho_userId_createdAt_idx" ON "ReEcho"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReEcho_userId_echoId_key" ON "ReEcho"("userId", "echoId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Bookmark_echoId_idx" ON "Bookmark"("echoId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_echoId_key" ON "Bookmark"("userId", "echoId");

-- CreateIndex
CREATE UNIQUE INDEX "Hashtag_name_key" ON "Hashtag"("name");

-- CreateIndex
CREATE INDEX "Hashtag_name_idx" ON "Hashtag"("name");

-- CreateIndex
CREATE INDEX "Hashtag_createdAt_idx" ON "Hashtag"("createdAt");

-- CreateIndex
CREATE INDEX "EchoHashtag_hashtagId_idx" ON "EchoHashtag"("hashtagId");

-- CreateIndex
CREATE UNIQUE INDEX "EchoHashtag_echoId_hashtagId_key" ON "EchoHashtag"("echoId", "hashtagId");

-- CreateIndex
CREATE INDEX "Echo_createdAt_idx" ON "Echo"("createdAt");

-- CreateIndex
CREATE INDEX "Echo_deleted_idx" ON "Echo"("deleted");

-- CreateIndex
CREATE INDEX "Echo_authorId_deleted_createdAt_idx" ON "Echo"("authorId", "deleted", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_echoId_fkey" FOREIGN KEY ("echoId") REFERENCES "Echo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ripple" ADD CONSTRAINT "Ripple_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ripple" ADD CONSTRAINT "Ripple_echoId_fkey" FOREIGN KEY ("echoId") REFERENCES "Echo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ripple" ADD CONSTRAINT "Ripple_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Ripple"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReEcho" ADD CONSTRAINT "ReEcho_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReEcho" ADD CONSTRAINT "ReEcho_echoId_fkey" FOREIGN KEY ("echoId") REFERENCES "Echo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_echoId_fkey" FOREIGN KEY ("echoId") REFERENCES "Echo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EchoHashtag" ADD CONSTRAINT "EchoHashtag_echoId_fkey" FOREIGN KEY ("echoId") REFERENCES "Echo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EchoHashtag" ADD CONSTRAINT "EchoHashtag_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_echoId_fkey" FOREIGN KEY ("echoId") REFERENCES "Echo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_rippleId_fkey" FOREIGN KEY ("rippleId") REFERENCES "Ripple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
