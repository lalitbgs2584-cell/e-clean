/**
 * Better Auth client for the Expo mobile app.
 * Re-uses the shared config from packages/auth but is instantiated
 * here so it can access expo-secure-store and Expo env vars directly.
 */
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { config } from "@/config/env";

export const authClient = createAuthClient({
  baseURL: config.apiUrl,
  plugins: [
    expoClient({
      scheme: "eclean",         // must match app.json "scheme"
      storagePrefix: "eclean",
      storage: SecureStore,
    }),
  ],
});

// Re-export the most useful helpers for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
