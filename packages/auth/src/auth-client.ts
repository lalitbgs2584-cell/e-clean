import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL:
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:7000",
  plugins: [
    expoClient({
      scheme: "eclean",        // must match app.json "scheme"
      storagePrefix: "eclean",
      storage: SecureStore,
    }),
  ],
});