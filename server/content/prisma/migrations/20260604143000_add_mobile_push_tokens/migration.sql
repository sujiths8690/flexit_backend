CREATE TABLE `MobilePushToken` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `token` VARCHAR(512) NOT NULL,
  `platform` VARCHAR(191) NOT NULL DEFAULT 'android',
  `app` VARCHAR(191) NOT NULL DEFAULT 'tex_flutter_app',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `businessId` INTEGER NOT NULL,
  `userId` INTEGER NULL,

  UNIQUE INDEX `MobilePushToken_token_key`(`token`),
  INDEX `MobilePushToken_businessId_idx`(`businessId`),
  INDEX `MobilePushToken_userId_idx`(`userId`),
  INDEX `MobilePushToken_isActive_idx`(`isActive`),
  INDEX `MobilePushToken_app_idx`(`app`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MobilePushToken`
  ADD CONSTRAINT `MobilePushToken_businessId_fkey`
  FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
