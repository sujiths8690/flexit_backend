ALTER TABLE `Business`
  ADD COLUMN `subscriptionOfferPlanId` VARCHAR(191) NULL,
  ADD COLUMN `subscriptionOfferPlanName` VARCHAR(191) NULL,
  ADD COLUMN `subscriptionOfferOriginalAmount` DECIMAL(65, 30) NULL,
  ADD COLUMN `subscriptionOfferAmount` DECIMAL(65, 30) NULL,
  ADD COLUMN `subscriptionOfferCurrency` VARCHAR(191) NULL DEFAULT 'INR',
  ADD COLUMN `subscriptionOfferExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `subscriptionOfferCreatedAt` DATETIME(3) NULL;

CREATE TABLE `BusinessAdminOffer` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NULL,
  `planName` VARCHAR(191) NULL,
  `originalAmount` DECIMAL(65, 30) NULL,
  `offerAmount` DECIMAL(65, 30) NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
  `extensionDays` INTEGER NULL,
  `previousEndsAt` DATETIME(3) NULL,
  `newEndsAt` DATETIME(3) NULL,
  `validUntil` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `businessId` INTEGER NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `BusinessAdminOffer_businessId_idx`(`businessId`),
  INDEX `BusinessAdminOffer_type_idx`(`type`),
  INDEX `BusinessAdminOffer_validUntil_idx`(`validUntil`),
  CONSTRAINT `BusinessAdminOffer_businessId_fkey`
    FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
);
