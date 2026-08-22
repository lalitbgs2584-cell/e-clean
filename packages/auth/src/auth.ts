import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { expo } from "@better-auth/expo";
import { bearer } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { prisma } from "db/client";
import { env } from "./config/env";

export const auth = betterAuth({
    baseURL: env.betterAuthUrl,
    secret: env.betterAuthSecret,
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    // These fields are part of the shared Prisma user record. Declaring them
    // here makes role checks available to every Better Auth session instead of
    // relying on untyped client-side data.
    user: {
        additionalFields: {
            role: { type: "string", required: false, defaultValue: "CITIZEN", input: false },
            zone: { type: "string", required: false, input: false },
            isActive: { type: "boolean", required: false, defaultValue: true, input: false },
        },
    },
    hooks: {
        // Hard rule: a WORKER's official profile image is assigned only by an
        // AUTHORITY (the Express backend and the authority portal manage it).
        // Block Better Auth's generic /update-user path so a worker cannot
        // bypass the ownership model by writing `image` directly — UI alone
        // is not sufficient.
        async before(ctx) {
            const endpointPath = (ctx as { path?: string }).path ?? "";
            if (endpointPath !== "/update-user") return;
            const body = ctx.body as Record<string, unknown> | undefined;
            if (!body || !("image" in body)) return;

            const hookSession = (ctx as { session?: any }).session;
            const role: string | undefined =
                hookSession?.user?.role ??
                (
                    await auth.api.getSession({
                        headers: ctx.headers as Headers,
                    }).catch(() => null)
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
        ...(env.nodeEnv === "development" ? [
            "exp://",
            "exp://**",
            "exp://192.168.*.*:*/**",
            "eclean://",
            "eclean://*",
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://192.168.1.*:*",
            "http://192.168.1.1:7000",
            "http://192.168.1.2:7000",
            "http://192.168.1.3:7000",
            "http://10.191.92.130:7000",
            "http://192.168.1.5:7000",
            "http://192.168.1.1:8081",
            "http://192.168.1.2:8081",
            "http://192.168.1.3:8081",
            "http://10.191.92.130:8081",
            "http://192.168.1.5:8081",
        ] : [
            "eclean://",
            "eclean://*",
        ])
    ],
    plugins: [
        // Authority API calls carry the current session token as a Bearer
        // header. Without this plugin Better Auth only looks for a cookie,
        // which caused the dashboard's repeated 401/login redirect loop.
        bearer(),
        expo(),
    ],
});

export type Auth = typeof auth;
