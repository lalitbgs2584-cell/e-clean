import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
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
  trustedOrigins: [
    authorityUrl,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  plugins: [bearer()],
});
