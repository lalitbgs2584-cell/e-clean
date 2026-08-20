"use client";
import { createAuthClient } from "better-auth/react";
<<<<<<< HEAD

// Better Auth is served locally by app/api/auth in this Next.js application.
const authorityOrigin =
  typeof window === "undefined"
    ? "http://localhost:3000"
    : window.location.origin;

export const authClient = createAuthClient({
  baseURL: `${authorityOrigin}/api/auth`,
});
=======
export const authClient = createAuthClient();
>>>>>>> eda3e8139a2ce90b795792b55d7493dba77ed185
