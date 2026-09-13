import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../lib/prisma.js";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

const clientID = env.GOOGLE_CLIENT_ID || "unset_google_client_id";
const clientSecret = env.GOOGLE_CLIENT_SECRET || "unset_google_client_secret";

passport.use(
    new GoogleStrategy(
        {
            clientID,
            clientSecret,
            callbackURL: `${env.SERVER_URL}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) {
                    return done(new Error("No email found in Google OAuth profile"), false);
                }

                let user = await prisma.user.findUnique({
                    where: { email },
                });

                let isNewUser = false;

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: profile.displayName || "User",
                            avatar: profile.photos?.[0]?.value ?? null,
                        },
                    });
                    isNewUser = true;
                }

                return done(null, { ...user, isNewUser });
            } catch (err) {
                logger.error("Passport Google Strategy error", { error: (err as Error)?.message });
                return done(err as Error, false);
            }
        }
    )
);

export default passport;