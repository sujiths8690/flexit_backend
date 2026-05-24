CREATE TABLE `Offer` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `offerType` VARCHAR(20) NOT NULL,
  `discountPrice` DECIMAL(65, 30) NULL,
  `buyQuantity` INTEGER NULL,
  `freeQuantity` INTEGER NULL,
  `startDate` DATETIME(3) NULL,
  `endDate` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `businessId` INTEGER NOT NULL,
  `freeProductId` INTEGER NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OfferItem` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `variantLabel` VARCHAR(50) NULL,
  `variantPrice` DECIMAL(65, 30) NULL,
  `offerId` INTEGER NOT NULL,
  `productId` INTEGER NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Offer`
  ADD CONSTRAINT `Offer_businessId_fkey`
  FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Offer`
  ADD CONSTRAINT `Offer_freeProductId_fkey`
  FOREIGN KEY (`freeProductId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `OfferItem`
  ADD CONSTRAINT `OfferItem_offerId_fkey`
  FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `OfferItem`
  ADD CONSTRAINT `OfferItem_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
