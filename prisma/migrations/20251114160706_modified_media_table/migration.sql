/*
  Warnings:

  - You are about to drop the column `height` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `sensitive` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Media` table. All the data in the column will be lost.
  - Added the required column `mimetype` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Media" DROP COLUMN "height",
DROP COLUMN "mimeType",
DROP COLUMN "sensitive",
DROP COLUMN "width",
ADD COLUMN     "mimetype" TEXT NOT NULL,
ADD COLUMN     "sensitivity" BOOLEAN NOT NULL DEFAULT false;
