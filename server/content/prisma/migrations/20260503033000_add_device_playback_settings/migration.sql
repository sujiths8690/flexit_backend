ALTER TABLE `Device`
  ADD COLUMN `displayContentMode` VARCHAR(191) NOT NULL DEFAULT 'allCategories',
  ADD COLUMN `selectedCategoryId` INTEGER NULL,
  ADD COLUMN `selectedMediaId` INTEGER NULL,
  ADD COLUMN `transitionStyle` VARCHAR(191) NOT NULL DEFAULT 'fade',
  ADD COLUMN `transitionSpeedSeconds` DOUBLE NOT NULL DEFAULT 0.5;
