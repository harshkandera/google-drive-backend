import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticate } from "../middlewares/auth";

const router = Router();

// Public route for user sync (called by NextAuth)
router.post("/sync", userController.syncUser);

// Protected routes
router.get("/profile", authenticate, userController.getProfile);

export default router;
