CREATE TABLE `SubscriptionPlanConfig` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `summary` TEXT NOT NULL,
  `minTvDevices` INTEGER NOT NULL,
  `maxTvDevices` INTEGER NOT NULL,
  `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
  `trialDays` INTEGER NULL,
  `features` JSON NULL,
  `discountName` VARCHAR(191) NULL,
  `discountAmount` DECIMAL(65, 30) NULL,
  `discountEndsAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
);

INSERT INTO `SubscriptionPlanConfig`
  (`id`, `name`, `summary`, `minTvDevices`, `maxTvDevices`, `amount`, `currency`, `trialDays`, `features`, `updatedAt`)
VALUES
  ('trial', 'Trial', 'Try Flexit with one TV before choosing a paid tier.', 1, 1, 0.00, 'INR', 20, JSON_ARRAY('20 days free', 'Connect 1 TV', 'All core menu tools'), CURRENT_TIMESTAMP(3)),
  ('clay', 'Clay', 'Starter plan for a single counter, branch, or display.', 1, 1, 999.00, 'INR', NULL, JSON_ARRAY('Connect 1 TV', 'Menu and media controls', 'Business display settings'), CURRENT_TIMESTAMP(3)),
  ('metal', 'Metal', 'For growing shops with multiple screens.', 2, 4, 2499.00, 'INR', NULL, JSON_ARRAY('Connect 2-4 TVs', 'Multi-screen management', 'Recommended for busy outlets'), CURRENT_TIMESTAMP(3)),
  ('steel', 'Steel', 'For larger businesses running several menu boards.', 4, 8, 4999.00, 'INR', NULL, JSON_ARRAY('Connect 4-8 TVs', 'Full display controls', 'Built for multi-zone menus'), CURRENT_TIMESTAMP(3));
