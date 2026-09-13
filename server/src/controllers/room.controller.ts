import type { Request, Response } from "express";
import type { JwtUser } from "../types/index.js";
import { RoomService } from "../services/room.service.js";
import { ForbiddenError } from "../errors/AppError.js";

export const createRoom = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const { mode } = req.body;
    const result = await RoomService.createRoom(user.userId, mode);
    res.status(201).json({ success: true, data: result });
};

export const getRoom = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const { id } = req.params as { id: string };
    const room = await RoomService.getRoomByIdForUser(id, user.userId);
    res.json({ success: true, data: room });
};

export const joinRoom = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const { roomId } = req.body;
    const result = await RoomService.joinRoom(user.userId, roomId);
    res.status(201).json({ success: true, data: result });
};

export const setRoomProblem = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const { roomId, problem } = req.body;

    const existingRoom = await RoomService.getRoomById(roomId);
    if (existingRoom.userId !== user.userId) {
        throw new ForbiddenError("Only the interviewer can change room problem");
    }

    const room = await RoomService.updateRoomProblem(roomId, problem);
    res.json({ success: true, data: room });
};

export const endSession = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const { roomId } = req.body;

    const existingRoom = await RoomService.getRoomById(roomId);
    if (existingRoom.userId !== user.userId) {
        throw new ForbiddenError("Only the room creator can end the session");
    }

    const result = await RoomService.endRoom(roomId);
    res.json({ success: true, data: result });
};