import { Router } from "express";
import {
  createComboOffer,
  deleteComboOffer,
  getComboOffers,
  getMenuProducts,
  getTodaysStar,
  setTodaysStar,
  updateComboOffer,
} from "../../controllers/contentFeature/contentFeature.controller";
import { authenticate } from "../../middleware/auth";
import { allowRoles } from "../../middleware/role";
import { Role } from "../../types/role";

const router = Router();

router.use(authenticate);

router.get("/products", getMenuProducts);

router.get("/combo-offers", getComboOffers);
router.post("/combo-offers", allowRoles(Role.ADMIN, Role.STAFF), createComboOffer);
router.patch(
  "/combo-offers/:comboId",
  allowRoles(Role.ADMIN, Role.STAFF),
  updateComboOffer
);
router.delete(
  "/combo-offers/:comboId",
  allowRoles(Role.ADMIN),
  deleteComboOffer
);

router.get("/todays-star", getTodaysStar);
router.put("/todays-star", allowRoles(Role.ADMIN, Role.STAFF), setTodaysStar);

export default router;
