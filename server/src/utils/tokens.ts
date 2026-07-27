import jwt from "jsonwebtoken";

interface TokenPayload {
    userId: string;
    role: string;
    name?: string;
    email?: string;
    avatar?: string | null;
}

export const generateAccessToken = (
    userId: string,
    role: string,
    profile?: { name?: string; email?: string; avatar?: string | null }
) => {
    const payload: TokenPayload = { userId, role };
    if (profile?.name) payload.name = profile.name;
    if (profile?.email) payload.email = profile.email;
    if (profile?.avatar) payload.avatar = profile.avatar;
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: "15m",
    });
};

export const generateRefreshToken = (userId: string) => {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: "7d",
    });
};