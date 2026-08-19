import { toNodeHandler } from "better-auth/node";
import { auth } from "auth";

// Better Auth handler for ALL /api/auth/* endpoints
// (sign-up/email, sign-in/email, sign-out, get-session, etc.)
//
// IMPORTANT: this is mounted directly in app.ts BEFORE express.json(),
// as required by the Better Auth docs — otherwise the auth client gets
// stuck on "pending". Express 5 path syntax requires the *splat wildcard.
export const betterAuthHandler = toNodeHandler(auth);
