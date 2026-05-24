import { Router } from "express";
import {
  createComboOffer,
  createNotice,
  createOffer,
  deleteComboOffer,
  deleteNotice,
  deleteOffer,
  getComboOffers,
  getMenuProducts,
  getNotices,
  getOffers,
  getTodaysStar,
  setTodaysStar,
  updateComboOffer,
  updateNotice,
  updateOffer,
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

router.get("/offers", getOffers);
router.post("/offers", allowRoles(Role.ADMIN, Role.STAFF), createOffer);
router.patch(
  "/offers/:offerId",
  allowRoles(Role.ADMIN, Role.STAFF),
  updateOffer
);
router.delete(
  "/offers/:offerId",
  allowRoles(Role.ADMIN),
  deleteOffer
);

router.get("/notices", getNotices);
router.post("/notices", allowRoles(Role.ADMIN, Role.STAFF), createNotice);
router.patch(
  "/notices/:noticeId",
  allowRoles(Role.ADMIN, Role.STAFF),
  updateNotice
);
router.delete(
  "/notices/:noticeId",
  allowRoles(Role.ADMIN),
  deleteNotice
);

router.get("/todays-star", getTodaysStar);
router.put("/todays-star", allowRoles(Role.ADMIN, Role.STAFF), setTodaysStar);

export default router;
