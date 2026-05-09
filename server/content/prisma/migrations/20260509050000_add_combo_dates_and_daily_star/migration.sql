ALTER TABLE `ComboOffer`
  ADD COLUMN `startDate` DATETIME(3) NULL,
  ADD COLUMN `endDate` DATETIME(3) NULL;

ALTER TABLE `TodaysStar`
  ADD COLUMN `businessId` INTEGER NULL,
  ADD COLUMN `starDate` DATETIME(3) NULL,
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

UPDATE `TodaysStar` ts
INNER JOIN `Product` p ON p.`id` = ts.`productId`
SET
  ts.`businessId` = p.`businessId`,
  ts.`starDate` = DATE(CURRENT_TIMESTAMP(3))
WHERE ts.`businessId` IS NULL OR ts.`starDate` IS NULL;

ALTER TABLE `TodaysStar`
  MODIFY `businessId` INTEGER NOT NULL,
  MODIFY `starDate` DATETIME(3) NOT NULL;

CREATE INDEX `TodaysStar_productId_idx` ON `TodaysStar`(`productId`);

DROP INDEX `TodaysStar_productId_key` ON `TodaysStar`;

CREATE UNIQUE INDEX `TodaysStar_businessId_starDate_key`
  ON `TodaysStar`(`businessId`, `starDate`);

ALTER TABLE `TodaysStar`
  ADD CONSTRAINT `TodaysStar_businessId_fkey`
  FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
