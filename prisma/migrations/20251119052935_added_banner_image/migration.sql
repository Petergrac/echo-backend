/*
  Warnings:

  - You are about to drop the column `targetType` on the `Like` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Like" DROP COLUMN "targetType";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannerImage" TEXT,
ADD COLUMN     "bannerPublicId" TEXT;

-- DropEnum
DROP TYPE "TargetType";
