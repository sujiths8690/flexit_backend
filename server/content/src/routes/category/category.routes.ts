import { Router } from "express";
import {
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from "../../controllers/category/category.controller";

import { authenticate } from "../../middleware/auth";
import { allowRoles } from "../../middleware/role";
import { Role } from "../../types/role";

const router = Router();

/**
 * All category routes require authentication
 */
router.use(authenticate);

/**
 * Create category
 * ADMIN + STAFF allowed
 */
router.post(
  "/",
  allowRoles(Role.ADMIN, Role.STAFF),
  createCategoryController
);

/**
 * Update category
 * ADMIN + STAFF allowed
 */
router.patch(
  "/:categoryId",
  allowRoles(Role.ADMIN, Role.STAFF),
  updateCategoryController
);

/**
 * Delete category
 * ADMIN only
 */
router.delete(
  "/:categoryId",
  allowRoles(Role.ADMIN),
  deleteCategoryController
);

export default router;