/*
  Warnings:

  - You are about to alter the column `name` on the `category` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(30)`.
  - You are about to alter the column `name` on the `combooffer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `name` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `keyName` on the `setting` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `value` on the `setting` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `passwordHash` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `mobileNumber` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(12)`.

*/
-- AlterTable
ALTER TABLE `category` MODIFY `name` VARCHAR(30) NOT NULL;

-- AlterTable
ALTER TABLE `combooffer` MODIFY `name` VARCHAR(50) NOT NULL,
    MODIFY `description` VARCHAR(200) NULL;

-- AlterTable
ALTER TABLE `product` MODIFY `name` VARCHAR(50) NOT NULL,
    MODIFY `description` VARCHAR(200) NULL;

-- AlterTable
ALTER TABLE `setting` MODIFY `keyName` VARCHAR(20) NOT NULL,
    MODIFY `value` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `passwordHash` VARCHAR(20) NOT NULL,
    MODIFY `mobileNumber` VARCHAR(12) NULL;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tokenHash` VARCHAR(20) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserActivity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `UserActivity` VARCHAR(50) NOT NULL,
    `flagActivity` BOOLEAN NOT NULL DEFAULT false,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserActivity` ADD CONSTRAINT `UserActivity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
