import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { createRoom, getRoom, joinRoom, endSession, setRoomProblem } from "../controllers/room.controller.js";
import { validate } from "../middleware/validate.js";
import { createRoomSchema, joinRoomSchema, setRoomProblemSchema, endSessionSchema } from "../middleware/schemas.js";

const router = express.Router();

router.post("/create", verifyToken, validate(createRoomSchema), createRoom);
router.post("/join", verifyToken, validate(joinRoomSchema), joinRoom);
router.get("/:id", verifyToken, getRoom);
router.post("/problem", verifyToken, validate(setRoomProblemSchema), setRoomProblem);
router.post("/end", verifyToken, validate(endSessionSchema), endSession);

export default router;