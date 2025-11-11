-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'AVATAR_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'AVATAR_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'POST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'POST_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'COMMENT_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'COMMENT_DELETED';
