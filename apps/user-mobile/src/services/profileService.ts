/**
 * Typed API client for the shared profile endpoints.
 * Mirrors workerService.ts: same config.apiUrl + Bearer token handling.
 */
import { config } from "@/config/env";
import { authClient } from "@/lib/auth-client";
import * as SecureStore from "expo-secure-store";

const base = config.apiUrl;

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  profileImageUrl?: string | null;
  role: string;
  emailVerified?: boolean;
  profileImageUploadedById?: string | null;
  profileImageAssignedAt?: string | null;
  createdAt?: string;
}

async function getAuthToken(): Promise<string | null> {
  try {
    const sessionRes = await authClient.getSession();
    if (sessionRes?.data?.session?.token) {
      return sessionRes.data.session.token;
    }
  } catch {}

  try {
    const token = await SecureStore.getItemAsync("eclean_session_token");
    if (token) return token;
  } catch {}

  try {
    const token = await SecureStore.getItemAsync("eclean_token");
    if (token) return token;
  } catch {}

  return null;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();

  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const json = await res
    .json()
    .catch(() => ({ success: false, error: "Invalid response" }));

  if (!res.ok) {
    throw new Error((json as any)?.error ?? `Request failed: ${res.status}`);
  }

  return json as T;
}

export const getMyProfile = () =>
  apiFetch<{ success: boolean; data: ProfileUser }>("/api/users/me");

const presignMyProfileImage = () =>
  apiFetch<{ success: boolean; url: string; key: string }>(
    "/api/users/me/profile-image/presign",
    { method: "POST", body: JSON.stringify({ mime: "image/jpeg" }) },
  );

const confirmMyProfileImage = (key: string) =>
  apiFetch<{ success: boolean; data: ProfileUser }>("/api/users/me/profile-image", {
    method: "PATCH",
    body: JSON.stringify({ key }),
  });

/**
 * Full self-service flow (CITIZEN/AUTHORITY only — WORKER is rejected by the
 * backend): presign → PUT to the profile bucket → confirm (DB update happens
 * last, only after the object exists).
 */
export async function uploadMyProfileImage(fileUri: string): Promise<ProfileUser> {
  const presign = await presignMyProfileImage();

  const image = await fetch(fileUri);
  if (!image.ok) throw new Error("Could not read the selected photo.");

  const uploadRes = await fetch(presign.url, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: await image.blob(),
  });
  if (!uploadRes.ok) {
    throw new Error(`Photo upload failed (${uploadRes.status}).`);
  }

  const confirmed = await confirmMyProfileImage(presign.key);
  return confirmed.data;
}

/** Refetches the Better Auth session so stale session copies are refreshed. */
export async function refreshSessionUser() {
  try {
    const res = await authClient.getSession({
      query: { disableCache: true },
    } as any);
    return res?.data?.user ?? null;
  } catch {
    return null;
  }
}
