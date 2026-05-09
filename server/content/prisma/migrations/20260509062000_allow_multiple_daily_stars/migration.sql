DROP INDEX `TodaysStar_businessId_starDate_key` ON `TodaysStar`;

CREATE UNIQUE INDEX `TodaysStar_businessId_starDate_productId_key`
  ON `TodaysStar`(`businessId`, `starDate`, `productId`);
