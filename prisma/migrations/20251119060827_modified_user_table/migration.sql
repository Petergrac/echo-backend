/*
  Warnings:

  - You are about to drop the column `bannerImage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `bannerPublicId` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "bannerImage",
DROP COLUMN "bannerPublicId";
