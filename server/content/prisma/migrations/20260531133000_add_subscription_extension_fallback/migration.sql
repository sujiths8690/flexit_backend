ALTER TABLE `Business`
  ADD COLUMN `subscriptionExtensionDays` INTEGER NULL,
  ADD COLUMN `subscriptionExtensionPreviousEndsAt` DATETIME(3) NULL,
  ADD COLUMN `subscriptionExtensionNewEndsAt` DATETIME(3) NULL,
  ADD COLUMN `subscriptionExtensionCreatedAt` DATETIME(3) NULL;
