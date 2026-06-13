ALTER TABLE `Business`
  ADD COLUMN `subscriptionEndsAt` DATETIME(3) NULL;

UPDATE `Business` b
JOIN (
  SELECT `businessId`, MAX(`createdAt`) AS `lastPaidAt`
  FROM `PlanTransaction`
  WHERE LOWER(`status`) = 'success'
  GROUP BY `businessId`
) paid ON paid.`businessId` = b.`id`
SET b.`subscriptionEndsAt` = DATE_ADD(paid.`lastPaidAt`, INTERVAL 1 MONTH)
WHERE b.`subscriptionEndsAt` IS NULL;
