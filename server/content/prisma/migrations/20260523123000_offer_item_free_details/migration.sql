ALTER TABLE `OfferItem`
  ADD COLUMN `buyQuantity` INTEGER NULL,
  ADD COLUMN `freeQuantity` INTEGER NULL,
  ADD COLUMN `freeProductId` INTEGER NULL;

ALTER TABLE `OfferItem`
  ADD CONSTRAINT `OfferItem_freeProductId_fkey`
  FOREIGN KEY (`freeProductId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
