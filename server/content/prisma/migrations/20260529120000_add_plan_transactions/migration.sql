ALTER TABLE `Business`
  ADD COLUMN `subscriptionPlanId` VARCHAR(191) NULL,
  ADD COLUMN `subscriptionPlanName` VARCHAR(191) NULL,
  ADD COLUMN `subscriptionStatus` VARCHAR(191) NULL,
  ADD COLUMN `subscriptionAmount` DECIMAL(65, 30) NULL DEFAULT 0.00,
  ADD COLUMN `subscriptionCurrency` VARCHAR(191) NULL DEFAULT 'INR',
  ADD COLUMN `subscriptionStartedAt` DATETIME(3) NULL,
  ADD COLUMN `subscriptionTrialEndsAt` DATETIME(3) NULL;

CREATE TABLE `PlanTransaction` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `transactionId` VARCHAR(191) NOT NULL,
  `invoiceId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
  `status` VARCHAR(191) NOT NULL DEFAULT 'success',
  `method` VARCHAR(191) NOT NULL DEFAULT 'plan',
  `planId` VARCHAR(191) NULL,
  `planName` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `customerId` INTEGER NULL,
  `customerName` VARCHAR(191) NULL,
  `customerEmail` VARCHAR(191) NULL,
  `customerPhone` VARCHAR(191) NULL,
  `rawDetails` JSON NULL,
  `businessId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PlanTransaction_transactionId_key`(`transactionId`),
  UNIQUE INDEX `PlanTransaction_invoiceId_key`(`invoiceId`),
  INDEX `PlanTransaction_businessId_idx`(`businessId`),
  INDEX `PlanTransaction_status_idx`(`status`),
  INDEX `PlanTransaction_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PlanTransaction`
  ADD CONSTRAINT `PlanTransaction_businessId_fkey`
  FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
