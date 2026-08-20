import { betterAuth, APIError } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "db/client";
import { env } from "@/config/env";

const authorityUrl = env.betterAuthUrl;

// This portal owns its Better Auth handler. It shares E-Clean's database but
// does not route sign-in or session handling through the Express backend.
export const auth = betterAuth({
  baseURL: authorityUrl,
  secret: env.betterAuthSecret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CITIZEN",
        input: false,
      },
      zone: { type: "string", required: false, input: false },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  hooks: {
    // A WORKER's official profile image is authority-assigned. Even though
    // this portal is meant for authorities, its /api/auth surface shares the
    // same user table and secret, so the same guard is enforced here.
    async before(ctx) {
      const endpointPath = (ctx as { path?: string }).path ?? "";
      if (endpointPath !== "/update-user") return;
      const body = ctx.body as Record<string, unknown> | undefined;
      if (!body || !("image" in body)) return;

      const hookSession = (ctx as { session?: any }).session;
      const role: string | undefined =
        hookSession?.user?.role ??
        (
          await auth.api
            .getSession({ headers: ctx.headers as Headers })
            .catch(() => null)
        )?.user?.role;

      if (role === "WORKER") {
        throw new APIError("FORBIDDEN", {
          message:
            "Workers cannot modify their official profile image. It is assigned by an authority.",
        });
      }
    },
  },
  trustedOrigins: [
    authorityUrl,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.4:3000",
    "http://192.168.1.2:3000",
  ],
  plugins: [bearer(), nextCookies()],
});
