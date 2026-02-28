/*
  Warnings:

  - You are about to drop the column `UserActivity` on the `useractivity` table. All the data in the column will be lost.
  - Added the required column `UserActivityDesc` to the `UserActivity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userActivityType` to the `UserActivity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `useractivity` DROP COLUMN `UserActivity`,
    ADD COLUMN `UserActivityDesc` VARCHAR(50) NOT NULL,
    ADD COLUMN `userActivityType` VARCHAR(50) NOT NULL;
