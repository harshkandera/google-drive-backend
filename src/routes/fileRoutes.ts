import { Router } from "express";
import * as fileController from "../controllers/fileController";
import { authenticate } from "../middlewares/auth";
import { validateRenameFile } from "../middlewares/validation";

const router = Router();

router.use(authenticate);

router.post(
  "/upload",
  fileController.upload.single("file"),
  fileController.uploadFile
);
router.get("/", fileController.getFiles);
router.get("/shared", fileController.getSharedFiles);
router.get("/search", fileController.searchFiles);
router.get("/:id", fileController.getFile);
router.get("/:id/download", fileController.getDownloadUrl);
router.patch("/:id/rename", validateRenameFile(), fileController.renameFile);
router.delete("/:id", fileController.deleteFile);

export default router;
