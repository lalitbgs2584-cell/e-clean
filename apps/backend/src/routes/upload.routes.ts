import { Router } from "express";
import { createPresignUrl } from "../controllers/upload.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const uploadRouter = Router();

uploadRouter.post("/create-presign-url",requireAuth, createPresignUrl);

export { uploadRouter };
