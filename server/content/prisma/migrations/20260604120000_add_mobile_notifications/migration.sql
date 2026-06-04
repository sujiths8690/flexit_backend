CREATE TABLE `MobileNotification` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `target` VARCHAR(191) NOT NULL DEFAULT 'BUSINESS',
  `title` VARCHAR(120) NOT NULL,
  `message` TEXT NOT NULL,
  `category` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
  `meta` JSON NULL,
  `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) NULL,
  `businessId` INTEGER NULL,

  INDEX `MobileNotification_businessId_idx`(`businessId`),
  INDEX `MobileNotification_target_idx`(`target`),
  INDEX `MobileNotification_sentAt_idx`(`sentAt`),
  INDEX `MobileNotification_deletedAt_idx`(`deletedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MobileNotification`
  ADD CONSTRAINT `MobileNotification_businessId_fkey`
  FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
