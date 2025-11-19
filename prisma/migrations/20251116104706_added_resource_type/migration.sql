/*
  Warnings:

  - You are about to drop the column `size` on the `Media` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Media" DROP COLUMN "size",
ADD COLUMN     "resourceType" TEXT;
