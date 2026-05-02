import { Router } from "express";
import {
  createProduct,
  updateProduct,
  getAllProducts,
  getOneProduct,
  deleteProduct,
  getProductsByCategory,
} from "../../controllers/product/product.controller";

import { authenticate } from "../../middleware/auth";
import { allowRoles } from "../../middleware/role";
import { Role } from "../../types/role";

const router = Router();

/**
 * All product routes require authentication
 */
router.use(authenticate);

/**
 * Create product
 * ADMIN + STAFF allowed
 */
router.post(
  "/",
  allowRoles(Role.ADMIN, Role.STAFF),
  createProduct
);

/**
 * Update product
 * ADMIN + STAFF allowed
 */
router.patch(
  "/:productId",
  allowRoles(Role.ADMIN, Role.STAFF),
  updateProduct
);

/**
 * Get all products
 * Any logged-in user
 */
router.get(
  "/",
  getAllProducts
);

router.get(
  "/category/:categoryId", 
  getProductsByCategory
);

/**
 * Get one product
 * Any logged-in user
 */
router.get(
  "/:productId",
  getOneProduct
);

/**
 * Delete product
 * ADMIN only
 */
router.delete(
  "/:productId",
  allowRoles(Role.ADMIN),
  deleteProduct
);

export default router;
