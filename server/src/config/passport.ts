import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../lib/prisma.js";

dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // 1. find user by email
                const email = profile.emails?.[0]?.value!;

                let user = await prisma.user.findUnique({
                    where: { email: email },
                });

                // 2. if no user → create one
                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            email: email,
                            name: profile.displayName,
                            avatar: profile.photos?.[0]?.value ?? null,
                        },
                    });
                }

                return done(null, user);
            } catch (err) {
                return done(err, false);
            }
        }
    )
);

export default passport;