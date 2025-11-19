/*
  Warnings:

  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('ECHO', 'RIPPLE');

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "targetType" "TargetType" NOT NULL DEFAULT 'ECHO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Media_echoId_idx" ON "Media"("echoId");
